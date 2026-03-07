import json
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional
import sys
import os

# プロジェクトルート（backendディレクトリ）をパスに追加
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.loader import DocumentProcessor
from src.vectorstore import VectorStoreManager
from src.generator import RAGGenerator
from src.config import Config
from fastapi.middleware.cors import CORSMiddleware
import requests

# グローバル変数
generator = None
doc_chunks = None  # BM25再構築用にチャンクを保持
rag_init_reason = None  # RAG が未初期化のときの理由（/health で返す）

# allow_credentials=True のときは "*" は使えないため、常に明示リスト
DEFAULT_CORS_ORIGINS = [
    "https://gomical.vercel.app",
    "http://localhost:8080",
    "http://localhost:19006",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:19006",
]


def _get_cors_origins():
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if raw == "*":
        return list(DEFAULT_CORS_ORIGINS)  # "*" 指定時も明示リストで返す（credentials のため）
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    return list(DEFAULT_CORS_ORIGINS)


def _cors_headers_for_request(request: Request) -> dict:
    """リクエストの Origin に合わせて CORS ヘッダーを返す（エラーレスポンス用）"""
    origin = request.headers.get("origin", "").strip()
    allowed = _get_cors_origins()
    if origin in allowed:
        return {"Access-Control-Allow-Origin": origin}
    if allowed:
        return {"Access-Control-Allow-Origin": allowed[0]}
    return {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションの起動・終了時の処理"""
    global generator, doc_chunks, rag_init_reason
    rag_init_reason = None
    try:
        config = Config()
        processor = DocumentProcessor()
        vs_manager = VectorStoreManager()
        
        # ドキュメントをロード（BM25用に常に必要）
        docs = processor.load_documents(config.DATA_RAW_DIR)
        doc_chunks = processor.split_documents(docs)
        
        if not docs:
            rag_init_reason = "no_documents"
            print("⚠ No documents found in", config.DATA_RAW_DIR, "- Add PDF/TXT and call /ingest.")
        else:
            # ハイブリッド検索の準備（既存DBがあれば再利用）
            hybrid_retriever = vs_manager.get_hybrid_retriever(doc_chunks, force_reingest=False)
            if hybrid_retriever:
                generator = RAGGenerator(retriever=hybrid_retriever)
                print("✓ RAG components (Hybrid) loaded successfully.")
            else:
                rag_init_reason = "no_retriever"
                print("⚠ No retriever available. Add documents and call /ingest.")
    except Exception as e:
        import traceback
        rag_init_reason = f"error:{type(e).__name__}:{str(e)[:200]}"
        print(f"⚠ Error loading RAG components: {e}")
        print(traceback.format_exc())
    
    yield  # アプリケーション実行中
    
    # 終了時のクリーンアップ
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

# CORSを許可（フロントエンドからのアクセス用）
# CORS_ORIGINS 環境変数で制限可能 (例: "https://gomical.vercel.app,http://localhost:8080")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """未処理の例外でもJSONとCORSヘッダーが付くようにする（500時にCORSでブロックされない）"""
    import traceback
    print(f"Unhandled error: {exc}\n{traceback.format_exc()}")
    headers = _cors_headers_for_request(request)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
        headers=headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """422 バリデーションエラーにも CORS を付与"""
    headers = _cors_headers_for_request(request)
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers=headers,
    )

# フロントエンドの静的ファイル配信
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
print(f"Frontend directory: {FRONTEND_DIR}")


# --- Pydantic Models ---

class ChatMessage(BaseModel):
    role: str
    text: str

class Location(BaseModel):
    latitude: float
    longitude: float

class QueryRequest(BaseModel):
    prompt: str
    config: Optional[dict] = None
    location: Optional[Location] = None
    image: Optional[str] = None
    history: Optional[list[ChatMessage]] = None

class SourceInfo(BaseModel):
    filename: str
    snippet: str
    page: Optional[int] = None

class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceInfo]


# --- Helper Functions ---

def get_address_from_coords(lat, lon):
    """緯度経度から住所を取得する（逆ジオコーディング）"""
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
        headers = {'User-Agent': 'Project_LLM_RAG_Demo/1.0'}
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            data = response.json()
            address = data.get('address', {})
            city = address.get('city') or address.get('ward') or address.get('town') or address.get('village') or ""
            state = address.get('state') or address.get('province') or ""
            return f"{state}{city}"
    except Exception as e:
        print(f"Reverse geocode error: {e}")
    return None

def build_source_list(result):
    """検索結果からソース情報を構築する"""
    sources = []
    seen_snippets = set()
    doc_list = result.get("source_documents") or []
    meta_list = result.get("metadata") or []
    for content, meta in zip(doc_list, meta_list):
        try:
            text = content if isinstance(content, str) else str(content)
            snippet = text[:200].replace("\n", " ").strip()
            if len(text) > 200:
                snippet += "..."
            if snippet not in seen_snippets:
                seen_snippets.add(snippet)
                meta = meta or {}
                src = meta.get("source", "Unknown")
                name = src.split("/")[-1].split("\\")[-1] if isinstance(src, str) else "Unknown"
                sources.append(SourceInfo(
                    filename=name,
                    snippet=snippet,
                    page=meta.get("page")
                ))
        except Exception:
            continue
    return sources

async def resolve_location(location: Optional[Location]) -> str:
    """位置情報を住所文字列に変換する"""
    if not location:
        return ""
    address = await asyncio.get_running_loop().run_in_executor(
        None, get_address_from_coords, location.latitude, location.longitude
    )
    if address:
        print(f"Detected Location: {address}")
        return f"現在のユーザーの位置情報: {address}\n"
    return ""


# --- API Endpoints ---

@app.get("/health")
async def health_check():
    """RAGコンポーネントの準備状況を返す"""
    out = {
        "status": "ready" if generator is not None else "loading",
        "rag_initialized": generator is not None
    }
    if generator is None and rag_init_reason:
        out["rag_init_reason"] = rag_init_reason
    return out

@app.get("/config")
async def get_config():
    """サーバーの設定情報を返す（APIキーは除外）"""
    config = Config()
    return config.to_dict()

@app.post("/query", response_model=QueryResponse)
async def query_rag(http_request: Request, request: QueryRequest):
    """通常のRAGクエリ（非ストリーミング）"""
    if generator is None:
        raise HTTPException(
            status_code=503, 
            detail="RAGシステムが初期化されていません。data/raw フォルダにPDFまたはTXTファイルを追加してサーバーを再起動してください。"
        )
    try:
        location_context = await resolve_location(request.location)
        full_prompt = location_context + request.prompt if location_context else request.prompt

        chat_history = None
        if request.history:
            chat_history = [{"role": m.role, "text": m.text} for m in request.history]

        result = generator.get_answer(
            full_prompt,
            request.config,
            image_data=request.image,
            chat_history=chat_history,
        )
        answer = result.get("answer") or ""
        sources = build_source_list(result)
        return QueryResponse(answer=answer, sources=sources)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"query_rag error: {e}\n{tb}")
        headers = _cors_headers_for_request(http_request)
        err_type = type(e).__name__
        detail = f"RAG処理中にエラーが発生しました: {err_type}"
        hint = ""
        if "Pinecone" in err_type or "pinecone" in str(e).lower():
            hint = "Cloud Run の環境変数 PINECONE_API_KEY を確認してください。"
        elif "OpenAI" in err_type or "openai" in str(e).lower() or "embed" in str(e).lower():
            hint = "埋め込み: EMBEDDING_TYPE=openrouter なら OPENROUTER_API_KEY のみ。openai なら OPENAI_API_KEY を設定してください。"
        elif "OpenRouter" in err_type or "openrouter" in str(e).lower():
            hint = "Cloud Run の環境変数 OPENROUTER_API_KEY を確認してください。"
        return JSONResponse(
            status_code=500,
            content={"detail": detail, "error_type": err_type, "hint": hint or None},
            headers=headers,
        )

@app.post("/query/stream")
async def query_rag_stream(request: QueryRequest):
    """ストリーミングRAGクエリ（SSE）"""
    if generator is None:
        raise HTTPException(
            status_code=503,
            detail="RAGシステムが初期化されていません。"
        )

    location_context = await resolve_location(request.location)
    full_prompt = location_context + request.prompt if location_context else request.prompt

    chat_history = None
    if request.history:
        chat_history = [{"role": m.role, "text": m.text} for m in request.history]

    async def event_generator():
        try:
            for chunk in generator.get_answer_stream(
                full_prompt,
                request.config,
                image_data=request.image,
                chat_history=chat_history
            ):
                chunk_type = chunk.get("type")
                
                if chunk_type == "sources":
                    sources = build_source_list(chunk)
                    data = json.dumps({
                        "type": "sources",
                        "sources": [s.model_dump() for s in sources]
                    }, ensure_ascii=False)
                    yield f"data: {data}\n\n"
                
                elif chunk_type == "token":
                    data = json.dumps({
                        "type": "token",
                        "token": chunk["token"]
                    }, ensure_ascii=False)
                    yield f"data: {data}\n\n"
                
                elif chunk_type == "done":
                    data = json.dumps({
                        "type": "done",
                        "answer": chunk["answer"]
                    }, ensure_ascii=False)
                    yield f"data: {data}\n\n"
                
                elif chunk_type == "error":
                    data = json.dumps({
                        "type": "error",
                        "message": chunk["message"]
                    }, ensure_ascii=False)
                    yield f"data: {data}\n\n"
                
                elif chunk_type == "complete":
                    # ドキュメントが見つからない場合
                    sources = build_source_list(chunk)
                    data = json.dumps({
                        "type": "complete",
                        "answer": chunk["answer"],
                        "sources": [s.model_dump() for s in sources]
                    }, ensure_ascii=False)
                    yield f"data: {data}\n\n"
                    
        except Exception as e:
            data = json.dumps({"type": "error", "message": str(e)}, ensure_ascii=False)
            yield f"data: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@app.post("/ingest")
async def ingest_documents():
    """ドキュメントを再取り込みしてベクトルストアを再構築する"""
    global generator, doc_chunks
    try:
        config = Config()
        processor = DocumentProcessor()
        vs_manager = VectorStoreManager()
        
        docs = processor.load_documents(config.DATA_RAW_DIR)
        doc_chunks = processor.split_documents(docs)
        
        if not doc_chunks:
            raise HTTPException(status_code=400, detail="data/raw にドキュメントが見つかりません。")
        
        hybrid_retriever = vs_manager.get_hybrid_retriever(doc_chunks, force_reingest=True)
        generator = RAGGenerator(retriever=hybrid_retriever)
        
        return {"status": "success", "chunks": len(doc_chunks)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- PDF File Endpoints ---
# NOTE: These must be registered BEFORE the catch-all StaticFiles mount below.

@app.get("/files")
async def list_files():
    """data/rawディレクトリ内のPDFファイル一覧を返す"""
    config = Config()
    raw_dir = config.DATA_RAW_DIR
    if not os.path.isdir(raw_dir):
        return {"files": []}
    files = [
        f for f in sorted(os.listdir(raw_dir))
        if f.lower().endswith(".pdf") and os.path.isfile(os.path.join(raw_dir, f))
    ]
    return {"files": files}

@app.get("/files/{filename}")
async def serve_file(filename: str):
    """指定されたPDFファイルを返す（パストラバーサル防止付き）"""
    safe_name = os.path.basename(filename)
    if safe_name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not safe_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are available")

    config = Config()
    file_path = os.path.join(config.DATA_RAW_DIR, safe_name)

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=safe_name
    )


# --- Static File Serving ---
# クラウドデプロイ時はフロントエンドを別ホスト(Cloudflare Pages等)で配信するため、
# SERVE_FRONTEND=false でスキップ可能
if os.getenv("SERVE_FRONTEND", "true").lower() != "false" and os.path.isdir(FRONTEND_DIR):
    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
