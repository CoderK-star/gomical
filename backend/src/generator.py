from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage
from .config import Config
import os
import re

class RAGGenerator:
    def __init__(self, vectorstore=None, retriever=None):
        self.config = Config()
        self.vectorstore = vectorstore
        self.llm = self._get_llm()
        
        if retriever:
            self.retriever = retriever
        elif vectorstore:
            self.retriever = vectorstore.as_retriever(search_kwargs={"k": 6})
        else:
            raise ValueError("Either vectorstore or retriever must be provided.")

    def _get_llm(self, override_config=None):
        """LLMインスタンスを取得する"""
        model_type = self.config.LLM_MODEL_TYPE
        model_name = self.config.LLM_MODEL_NAME
        openai_api_key = self.config.OPENAI_API_KEY
        openrouter_api_key = self.config.OPENROUTER_API_KEY
        openrouter_base_url = self.config.OPENROUTER_BASE_URL
        ollama_base_url = self.config.OLLAMA_BASE_URL
        temperature = 0.3

        if override_config:
            model_type = override_config.get("type", model_type)
            model_name = override_config.get("name", model_name)
            address = override_config.get("address", "")
            if address:
                if model_type == "openai":
                    openai_api_key = address
                elif model_type == "openrouter":
                    openrouter_api_key = address
                else:
                    ollama_base_url = address
            try:
                temperature = float(override_config.get("temp", 0.3))
            except (ValueError, TypeError):
                temperature = 0.3

        if model_type == "openrouter":
            return ChatOpenAI(
                model=model_name,
                openai_api_key=openrouter_api_key,
                openai_api_base=openrouter_base_url,
                temperature=temperature,
                default_headers={
                    "HTTP-Referer": "https://gomical.app",
                    "X-Title": "Gomical RAG",
                },
            )
        elif model_type == "openai":
            return ChatOpenAI(
                model_name=model_name,
                openai_api_key=openai_api_key,
                temperature=temperature
            )
        else:
            return ChatOllama(
                model=model_name,
                base_url=ollama_base_url,
                temperature=temperature,
                num_ctx=8192
            )

    @staticmethod
    def _estimate_tokens(text):
        """Rough token count: ~1.5 chars per token for Japanese, ~4 chars for ASCII."""
        ja_chars = len(re.findall(r'[\u3000-\u9fff\uf900-\ufaff]', text))
        ascii_chars = len(text) - ja_chars
        return int(ja_chars / 1.5 + ascii_chars / 4)

    def _format_docs_with_metadata(self, docs, max_context_tokens=None):
        """ドキュメントをメタデータ付きで整形する。max_context_tokensを超えたら打ち切る。"""
        if max_context_tokens is None:
            max_context_tokens = 4000
        formatted_text = ""
        current_tokens = 0
        for i, doc in enumerate(docs):
            source = os.path.basename(doc.metadata.get("source", "Unknown"))
            page = doc.metadata.get("page", "")
            page_info = f" (Page {page})" if page else ""
            block = f"---\n[Source {i+1}: {source}{page_info}]\n{doc.page_content}\n"
            block_tokens = self._estimate_tokens(block)
            if current_tokens + block_tokens > max_context_tokens and formatted_text:
                break
            formatted_text += block
            current_tokens += block_tokens
        return formatted_text

    def _build_system_prompt(self):
        """システムプロンプトを構築する"""
        return """あなたは自治体のごみ分別案内アシスタントです。提供された資料に基づいて、住民の質問に正確かつ簡潔に答えてください。

## ルール
- 回答は提供された【資料】の情報のみに基づくこと。外部知識は使わない。
- 資料に答えがない場合は「資料に記載がありません」と正直に答える。推測しない。
- 複数の資料から関連情報がある場合は統合して説明する。
- 会話履歴がある場合は前の文脈を踏まえて答える。

## 回答のフォーマット
- 簡単な質問には1〜3文で簡潔に答える。長い前置きは不要。
- 見出し（##）は複数のトピックを扱う場合のみ使用する。
- 箇条書きは3項目以上の列挙がある場合のみ使う。 
- 段落間に余計な空行を入れない。
- 「以下に説明します」「まとめると」などの冗長な導入文は省く。

## トーン
市役所の窓口で丁寧に説明するような自然な日本語で答えてください。堅すぎず、カジュアルすぎない口調を心がけてください。"""

    def _build_messages(self, query, context_text, chat_history=None, image_data=None):
        """プロンプトメッセージを構築する"""
        messages = [SystemMessage(content=self._build_system_prompt())]

        # 会話履歴を含める
        if chat_history:
            for msg in chat_history[-10:]:  # 最新10件まで
                role = msg.get("role", "")
                text = msg.get("text", "")
                if not text:
                    continue
                if role == "user":
                    messages.append(HumanMessage(content=text))
                elif role == "system":
                    from langchain_core.messages import AIMessage
                    messages.append(AIMessage(content=text))

        image_note = "画像も提供されています。内容を考慮して回答してください。\n\n" if image_data else ""
        human_text = f"""{image_note}【資料】
{context_text}

【質問】
{query}"""

        if image_data:
            content_blocks = [
                {"type": "text", "text": human_text},
                {"type": "image_url", "image_url": {"url": image_data}}
            ]
            messages.append(HumanMessage(content=content_blocks))
        else:
            messages.append(HumanMessage(content=human_text))

        return messages

    def get_answer(self, query, config_override=None, image_data=None, chat_history=None):
        """質問に対してNotebookLMスタイルの深い回答を生成する"""
        
        # LLMの準備 (オーバーライドがあれば一時的なLLMを作成)
        current_llm = self.llm
        if config_override:
            try:
                current_llm = self._get_llm(config_override)
            except Exception as e:
                print(f"Error creating override LLM, falling back to default: {e}")

        # 関連ドキュメントの検索
        source_docs = self.retriever.invoke(query)
        
        if not source_docs:
            return {
                "answer": "申し訳ありませんが、提供された資料の中に、その質問に関連する情報は見つかりませんでした。",
                "source_documents": [],
                "metadata": []
            }

        # コンテキストの整形 (ソース情報を明示)
        context_text = self._format_docs_with_metadata(source_docs)

        # メッセージの構築
        messages = self._build_messages(query, context_text, chat_history, image_data)

        # 回答の生成
        try:
            response = current_llm.invoke(messages)
            content = response.content
        except Exception as e:
            content = f"エラーが発生しました: {str(e)}"

        return {
            "answer": content,
            "source_documents": [doc.page_content for doc in source_docs],
            "metadata": [doc.metadata for doc in source_docs]
        }

    def get_answer_stream(self, query, config_override=None, image_data=None, chat_history=None):
        """ストリーミングで回答を生成するジェネレータ"""
        
        current_llm = self.llm
        if config_override:
            try:
                current_llm = self._get_llm(config_override)
            except Exception as e:
                print(f"Error creating override LLM, falling back to default: {e}")

        # 関連ドキュメントの検索
        source_docs = self.retriever.invoke(query)
        
        if not source_docs:
            yield {
                "type": "complete",
                "answer": "申し訳ありませんが、提供された資料の中に、その質問に関連する情報は見つかりませんでした。",
                "source_documents": [],
                "metadata": []
            }
            return

        context_text = self._format_docs_with_metadata(source_docs)
        messages = self._build_messages(query, context_text, chat_history, image_data)

        # ソース情報を先に送信
        yield {
            "type": "sources",
            "source_documents": [doc.page_content for doc in source_docs],
            "metadata": [doc.metadata for doc in source_docs]
        }

        # ストリーミングで回答を生成
        full_answer = ""
        try:
            for chunk in current_llm.stream(messages):
                token = chunk.content
                if token:
                    full_answer += token
                    yield {"type": "token", "token": token}
        except Exception as e:
            yield {"type": "error", "message": str(e)}
            return

        yield {"type": "done", "answer": full_answer}
