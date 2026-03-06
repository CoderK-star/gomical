import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

class DocumentProcessor:
    def __init__(self, chunk_size=1500, chunk_overlap=300):
        # Larger chunks preserve more context for better answers
        # More overlap ensures continuity between chunks
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            is_separator_regex=False,
            separators=["\n\n", "\n", "。", "、", " ", ""],  # Japanese-aware separators
        )

    def load_documents(self, directory_path):
        """指定されたディレクトリからドキュメントを読み込む"""
        print(f"Loading documents from {directory_path}...")
        
        # PDFの読み込み (recursive=True を指定してサブフォルダも探索)
        pdf_loader = DirectoryLoader(directory_path, glob="**/*.pdf", loader_cls=PyPDFLoader, recursive=True)
        # テキストの読み込み
        txt_loader = DirectoryLoader(directory_path, glob="**/*.txt", loader_cls=TextLoader, recursive=True)
        
        docs = []
        try:
            docs.extend(pdf_loader.load())
        except Exception as e:
            print(f"Error loading PDFs: {e}")
            
        try:
            docs.extend(txt_loader.load())
        except Exception as e:
            print(f"Error loading Text files: {e}")
            
        return docs

    def split_documents(self, documents):
        """ドキュメントをチャンクに分割する"""
        print(f"Splitting {len(documents)} documents into chunks...")
        chunks = self.text_splitter.split_documents(documents)
        print(f"Created {len(chunks)} chunks.")
        return chunks
