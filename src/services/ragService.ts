import Constants from 'expo-constants';

function getBackendUrl(): string {
  const url = Constants.expoConfig?.extra?.backendUrl;
  if (!url) throw new Error('Backend URL is not configured in app.json extra.backendUrl');
  return (url as string).replace(/\/+$/, '');
}

/** バックエンド（Cloud Run）の疎通確認。Vercel → Cloud Run 接続テストに利用 */
export async function testBackendConnection(): Promise<{
  ok: boolean;
  status?: string;
  ragInitialized?: boolean;
  error?: string;
}> {
  try {
    const baseUrl = getBackendUrl();
    const res = await fetch(`${baseUrl}/health`, { method: 'GET' });
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: data.status ?? (res.ok ? 'ready' : 'error'),
      ragInitialized: data.rag_initialized,
      error: res.ok ? undefined : (data.detail ?? `HTTP ${res.status}`),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SourceInfo {
  filename: string;
  snippet: string;
  page?: number;
}

interface QueryResponse {
  answer: string;
  sources: SourceInfo[];
}

/** chat.tsx が保持する会話履歴をバックエンド形式に変換する */
function toBackendHistory(
  messages: ChatMessage[],
): { role: string; text: string }[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'system' : 'user',
      text: m.content,
    }));
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  municipalityName: string,
): Promise<{ answer: string; sources: SourceInfo[] }> {
  const baseUrl = getBackendUrl();

  const res = await fetch(`${baseUrl}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: message,
      history: toBackendHistory(history),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`RAG API error: ${res.status} ${text}`);
  }

  const data: QueryResponse = await res.json();
  return {
    answer: data.answer,
    sources: data.sources,
  };
}
