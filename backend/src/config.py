import os
from dotenv import load_dotenv

# プロジェクトルートと backend ディレクトリを検出して .env を確実に読み込む
_SRC_DIR = os.path.dirname(os.path.abspath(__file__))          # .../backend/src
_BACKEND_DIR = os.path.dirname(_SRC_DIR)                       # .../backend
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)                  # .../

# 1. 既に OS に設定されている環境変数を優先
# 2. プロジェクトルートの .env（存在すれば）
# 3. backend/.env（存在すれば）
load_dotenv(os.path.join(_PROJECT_ROOT, ".env"))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))


class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    LLM_MODEL_TYPE = os.getenv("LLM_MODEL_TYPE", "ollama")
    LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME", "qwen2.5:3b")
    # 埋め込み: "ollama"（デフォルト）/ "openai" / "openrouter"。openrouter 時は EMBEDDING_MODEL_NAME に "openai/text-embedding-3-small" 等を指定。
    EMBEDDING_TYPE = os.getenv("EMBEDDING_TYPE", "ollama").strip().lower()
    EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "nomic-embed-text")
    DATA_RAW_DIR = os.getenv("DATA_RAW_DIR", "data/raw")
    DATA_PROCESSED_DIR = os.getenv("DATA_PROCESSED_DIR", "data/processed")

    # Pinecone
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
    PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "gomical-rag")

    def to_dict(self):
        """設定を辞書として返す（APIキーは除外）"""
        return {
            "model_type": self.LLM_MODEL_TYPE,
            "model_name": self.LLM_MODEL_NAME,
            "embedding_type": self.EMBEDDING_TYPE,
            "embedding_model": self.EMBEDDING_MODEL_NAME,
            "ollama_base_url": self.OLLAMA_BASE_URL,
            "has_openai_key": bool(self.OPENAI_API_KEY and self.OPENAI_API_KEY != "none"),
            "has_openrouter_key": bool(self.OPENROUTER_API_KEY),
            "has_pinecone_key": bool(self.PINECONE_API_KEY),
        }
