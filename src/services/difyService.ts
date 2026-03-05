import Constants from 'expo-constants';

const DIFY_API_URL = 'https://api.dify.ai/v1';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface DifyResponse {
  answer: string;
  conversation_id: string;
  message_id: string;
}

function getApiKey(): string {
  const key = Constants.expoConfig?.extra?.difyApiKey;
  if (!key) throw new Error('Dify API key is not configured in app.json extra.difyApiKey');
  return key as string;
}

export async function sendChatMessage(
  message: string,
  conversationId: string | null,
  municipalityName: string,
): Promise<{ answer: string; conversationId: string }> {
  const apiKey = getApiKey();

  const res = await fetch(`${DIFY_API_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: { municipality_name: municipalityName },
      query: message,
      response_mode: 'blocking',
      conversation_id: conversationId ?? '',
      user: 'gomical-user',
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Dify API error: ${res.status} ${text}`);
  }

  const data: DifyResponse = await res.json();
  return {
    answer: data.answer,
    conversationId: data.conversation_id,
  };
}
