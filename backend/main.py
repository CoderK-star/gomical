import argparse
import sys
import os

# プロジェクトルートをパスに追加
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.loader import DocumentProcessor
from src.vectorstore import VectorStoreManager
from src.generator import RAGGenerator
from src.extractor import DataExtractor
from src.evaluator import RAGEvaluator
from src.config import Config

def main():
    parser = argparse.ArgumentParser(description="Waste Sorting RAG System")
    parser.add_argument("--ingest", action="store_true", help="Ingest documents and create vector store")
    parser.add_argument("--extract", action="store_true", help="Extract structured data from documents")
    parser.add_argument("--eval", action="store_true", help="Evaluate the RAG system quality")
    parser.add_argument("--query", type=str, help="Query the RAG system")
    args = parser.parse_args()

    config = Config()
    
    if args.ingest:
        # ドキュメントの読み込みと分割
        processor = DocumentProcessor()
        docs = processor.load_documents(config.DATA_RAW_DIR)
        if not docs:
            print(f"No documents found in {config.DATA_RAW_DIR}. Please add some files first.")
            return
        
        chunks = processor.split_documents(docs)
        
        # ベクトルストアの作成
        vs_manager = VectorStoreManager()
        vs_manager.create_vectorstore(chunks)
        print("Ingestion completed.")

    if args.extract:
        # 構造化データの抽出
        print("Starting structured data extraction...")
        processor = DocumentProcessor()
        docs = processor.load_documents(config.DATA_RAW_DIR)
        
        extractor = DataExtractor()
        all_extracted_data = []
        
        for doc in docs:
            print(f"Processing document: {doc.metadata.get('source', 'Unknown')}")
            extracted = extractor.extract_from_text(doc.page_content)
            all_extracted_data.extend(extracted)
        
        if all_extracted_data:
            extractor.save_to_json(all_extracted_data, "garbage_rules.json")
            extractor.save_to_csv(all_extracted_data, "garbage_rules.csv")
            print(f"Successfully extracted {len(all_extracted_data)} rules.")
        else:
            print("No data extracted.")

    if args.eval:
        import json
        # 評価の実行
        print("Starting quality evaluation...")

        # ドキュメントの読み込みと分割（ハイブリッド検索のために必要）
        processor = DocumentProcessor()
        docs = processor.load_documents(config.DATA_RAW_DIR)
        chunks = processor.split_documents(docs)

        vs_manager = VectorStoreManager()
        hybrid_retriever = vs_manager.get_hybrid_retriever(chunks)
        generator = RAGGenerator(retriever=hybrid_retriever)
        evaluator = RAGEvaluator()

        # テストケースの定義
        test_cases = [
            {"query": "可燃ごみはいつ出せばいい？"},
            {"query": "大きな家具を捨てたい場合は？"},
            {"query": "ペットボトルのキャップはどうすればいい？"},
            {"query": "パソコンは不燃ごみで出せますか？"}
        ]

        results = evaluator.run_eval_suite(test_cases, generator)
        
        output_file = os.path.join(config.DATA_PROCESSED_DIR, "eval_results.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=4)
        print(f"Evaluation results saved to {output_file}")

    if args.query:
        # ドキュメントの読み込みと分割（ハイブリッド検索のために必要）
        processor = DocumentProcessor()
        docs = processor.load_documents(config.DATA_RAW_DIR)
        chunks = processor.split_documents(docs)

        # ベクトルストアとハイブリッドリトリーバーの準備
        vs_manager = VectorStoreManager()
        hybrid_retriever = vs_manager.get_hybrid_retriever(chunks)
        
        # 生成
        generator = RAGGenerator(retriever=hybrid_retriever)
        print(f"Querying (Hybrid): {args.query}")
        result = generator.get_answer(args.query)
        
        print("\n--- Answer ---")
        print(result["answer"])
        print("\n--- Sources ---")
        for i, meta in enumerate(result["metadata"]):
            print(f"[{i+1}] {meta.get('source', 'Unknown')}")

if __name__ == "__main__":
    main()
