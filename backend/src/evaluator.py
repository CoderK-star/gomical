import json
import os
from typing import List, Dict
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from .config import Config

class EvalResult(BaseModel):
    faithfulness: float = Field(description="忠実性: 回答がコンテキストに基づいているか (0.0-1.0)")
    answer_relevance: float = Field(description="回答の関連性: 回答が質問に適切に答えているか (0.0-1.0)")
    reason: str = Field(description="評価の理由")

class RAGEvaluator:
    def __init__(self):
        self.config = Config()
        self.llm = self._get_llm()

    def _get_llm(self):
        if self.config.LLM_MODEL_TYPE == "openai":
            return ChatOpenAI(model_name=self.config.LLM_MODEL_NAME, temperature=0)
        else:
            return ChatOllama(model=self.config.LLM_MODEL_NAME, base_url=self.config.OLLAMA_BASE_URL, temperature=0)

    def evaluate_response(self, query: str, answer: str, contexts: List[str]) -> Dict:
        """回答の品質をLLMで評価する"""
        prompt = PromptTemplate(
            template="""あなたはRAG（検索補完生成）システムの評価者です。
以下の「質問」「回答」「提供されたコンテキスト」を元に、回答の品質を評価してください。

評価項目:
1. Faithfulness (忠実性): 回答が提供されたコンテキストのみに基づいているか。コンテキストにない情報を含んでいないか。
2. Answer Relevance (関連性): 回答がユーザーの質問に直接的かつ適切に答えているか。

出力形式は必ず以下のJSON形式にしてください:
{{
  "faithfulness": 0.0から1.0の数値,
  "answer_relevance": 0.0から1.0の数値,
  "reason": "評価理由の簡潔な説明"
}}

---
質問: {query}
コンテキスト: {contexts}
回答: {answer}
---
評価結果:""",
            input_variables=["query", "contexts", "answer"]
        )

        _input = prompt.format(query=query, contexts="\n".join(contexts), answer=answer)
        
        try:
            response = self.llm.invoke(_input)
            # JSON部分を抽出（LLMが余計な文を出す場合があるため）
            content = response.content
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end != -1:
                return json.loads(content[start:end])
            return {"error": "Invalid output format"}
        except Exception as e:
            return {"error": str(e)}

    def run_eval_suite(self, test_cases: List[Dict], rag_generator):
        """複数のテストケースに対して評価を実行する"""
        results = []
        print(f"Starting evaluation suite for {len(test_cases)} cases...")
        
        for i, case in enumerate(test_cases):
            query = case["query"]
            print(f"[{i+1}/{len(test_cases)}] Evaluating query: {query}")
            
            # RAGシステムから回答を取得
            rag_result = rag_generator.get_answer(query)
            
            # 評価の実行
            eval_score = self.evaluate_response(
                query=query,
                answer=rag_result["answer"],
                contexts=rag_result["source_documents"]
            )
            
            results.append({
                "query": query,
                "answer": rag_result["answer"],
                "eval": eval_score
            })
            
        return results
