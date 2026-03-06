import json
import os
from typing import List, Dict
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from .config import Config

class GarbageRule(BaseModel):
    item: str = Field(description="品目名（例：ペットボトル、乾電池）")
    category: str = Field(description="ゴミの分類（例：可燃ごみ、資源ごみ）")
    disposal_method: str = Field(description="出し方・注意点")
    schedule: str = Field(description="排出日・頻度（例：毎週月曜日、第2・4水曜日）")

class StructuredDataList(BaseModel):
    rules: List[GarbageRule]

class DataExtractor:
    def __init__(self):
        self.config = Config()
        self.llm = self._get_llm()
        self.parser = PydanticOutputParser(pydantic_object=StructuredDataList)

    def _get_llm(self):
        if self.config.LLM_MODEL_TYPE == "openai":
            return ChatOpenAI(
                model_name=self.config.LLM_MODEL_NAME,
                openai_api_key=self.config.OPENAI_API_KEY,
                temperature=0
            )
        else:
            return ChatOllama(
                model=self.config.LLM_MODEL_NAME,
                base_url=self.config.OLLAMA_BASE_URL,
                temperature=0
            )

    def extract_from_text(self, text: str) -> List[Dict]:
        """テキストから構造化データを抽出する"""
        prompt = PromptTemplate(
            template="""以下の「ごみ分別ルール」に関するテキストから、品目ごとの情報を抽出してJSON形式で出力してください。
可能な限り詳細に抽出してください。

{format_instructions}

テキスト:
{text}
""",
            input_variables=["text"],
            partial_variables={"format_instructions": self.parser.get_format_instructions()}
        )

        _input = prompt.format_prompt(text=text)
        
        try:
            output = self.llm.invoke(_input.to_string())
            # ChatOllamaの場合は .content、ChatOpenAIも .content
            parsed_output = self.parser.parse(output.content)
            return [rule.dict() for rule in parsed_output.rules]
        except Exception as e:
            print(f"Error during extraction: {e}")
            return []

    def save_to_json(self, data: List[Dict], filename: str):
        """抽出したデータをJSONファイルとして保存する"""
        from .config import Config
        output_path = os.path.join(Config.DATA_PROCESSED_DIR, filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Structured data saved to {output_path}")

    def save_to_csv(self, data: List[Dict], filename: str):
        """抽出したデータをCSVファイルとして保存する"""
        import pandas as pd
        from .config import Config
        output_path = os.path.join(Config.DATA_PROCESSED_DIR, filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        df = pd.DataFrame(data)
        df.to_csv(output_path, index=False, encoding="utf-8-sig")
        print(f"Structured data saved to {output_path}")
