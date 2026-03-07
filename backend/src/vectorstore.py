from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_ollama import OllamaEmbeddings
from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from .config import Config

class VectorStoreManager:
    def __init__(self):
        self.config = Config()
        self.embeddings = self._get_embeddings()
        self.pc = Pinecone(api_key=self.config.PINECONE_API_KEY)
        self.index_name = self.config.PINECONE_INDEX_NAME

    def _get_embeddings(self):
        # EMBEDDING_TYPE: openai / openrouter（OpenAI互換API）/ ollama（デフォルト）
        if self.config.EMBEDDING_TYPE == "openai" and self.config.OPENAI_API_KEY and self.config.OPENAI_API_KEY.strip().lower() != "none":
            return OpenAIEmbeddings(openai_api_key=self.config.OPENAI_API_KEY, model=self.config.EMBEDDING_MODEL_NAME)
        if self.config.EMBEDDING_TYPE == "openrouter" and self.config.OPENROUTER_API_KEY:
            # OpenRouter は OpenAI 互換の /embeddings API を提供（要 EMBEDDING_MODEL_NAME 例: openai/text-embedding-3-small）
            model = self.config.EMBEDDING_MODEL_NAME
            if model == "nomic-embed-text" or "/" not in model:
                model = "openai/text-embedding-3-small"
            return OpenAIEmbeddings(
                openai_api_key=self.config.OPENROUTER_API_KEY,
                openai_api_base=self.config.OPENROUTER_BASE_URL,
                model=model,
            )
        return OllamaEmbeddings(
            model=self.config.EMBEDDING_MODEL_NAME,
            base_url=self.config.OLLAMA_BASE_URL,
        )

    def _ensure_index(self, dimension: int):
        """Pinecone インデックスが存在しなければ作成する"""
        existing = [idx.name for idx in self.pc.list_indexes()]
        if self.index_name not in existing:
            print(f"Creating Pinecone index '{self.index_name}' (dim={dimension})...")
            self.pc.create_index(
                name=self.index_name,
                dimension=dimension,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
            print(f"Index '{self.index_name}' created.")

    def _get_embedding_dimension(self) -> int:
        """エンベディングモデルの次元数を取得する"""
        sample = self.embeddings.embed_query("test")
        return len(sample)

    def create_vectorstore(self, chunks):
        """チャンクからPineconeベクトルストアを作成する"""
        print("Creating Pinecone vector store...")
        dimension = self._get_embedding_dimension()
        self._ensure_index(dimension)

        vectorstore = PineconeVectorStore.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            index_name=self.index_name,
        )
        print(f"Vector store created in Pinecone index '{self.index_name}'.")
        return vectorstore

    def load_vectorstore(self):
        """既存のPineconeベクトルストアを読み込む"""
        return PineconeVectorStore(
            index_name=self.index_name,
            embedding=self.embeddings,
        )

    def has_existing_vectorstore(self):
        """Pineconeインデックスが存在し、データが入っているか確認する"""
        try:
            existing = [idx.name for idx in self.pc.list_indexes()]
            if self.index_name not in existing:
                return False
            index = self.pc.Index(self.index_name)
            stats = index.describe_index_stats()
            return stats.total_vector_count > 0
        except Exception:
            return False

    def clear_index(self):
        """Pineconeインデックスの全データを削除する"""
        try:
            index = self.pc.Index(self.index_name)
            index.delete(delete_all=True)
            print(f"All vectors deleted from index '{self.index_name}'.")
        except Exception as e:
            print(f"Error clearing index: {e}")

    def get_hybrid_retriever(self, chunks, force_reingest=False):
        """ベクトル検索とキーワード検索（BM25）を組み合わせたハイブリッドリトリーバーを返す"""
        print("Initializing hybrid retriever...")

        # ドキュメントが空の場合
        if not chunks or len(chunks) == 0:
            print("WARNING: No documents found. Please add PDF/TXT files to data/raw folder.")
            print("The system will start but RAG queries may not work properly.")
            if self.has_existing_vectorstore():
                print("Loading existing Pinecone vector store...")
                vectorstore = self.load_vectorstore()
                return vectorstore.as_retriever(search_kwargs={"k": 6})
            return None

        # 既存のベクトルストアがあり、強制再取り込みでなければ再利用
        if self.has_existing_vectorstore() and not force_reingest:
            print("Loading existing Pinecone vector store (use /ingest to rebuild)...")
            vectorstore = self.load_vectorstore()
        else:
            if force_reingest:
                self.clear_index()
            vectorstore = self.create_vectorstore(chunks)

        vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 6})

        bm25_retriever = BM25Retriever.from_documents(chunks)
        bm25_retriever.k = 6

        # アンサンブル（重み付け：ベクトル 0.6, BM25 0.4 - セマンティック検索を優先）
        ensemble_retriever = EnsembleRetriever(
            retrievers=[vector_retriever, bm25_retriever],
            weights=[0.6, 0.4]
        )

        return ensemble_retriever
