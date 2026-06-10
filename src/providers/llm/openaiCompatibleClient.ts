export interface OpenAiCompatibleMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAiCompatibleCompletionRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: OpenAiCompatibleMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface OpenAiCompatibleCompletionResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export async function createOpenAiCompatibleCompletion(
  request: OpenAiCompatibleCompletionRequest,
): Promise<OpenAiCompatibleCompletionResponse> {
  const url = `${normalizeBaseUrl(request.baseUrl)}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);
  const signal = request.signal ?? controller.signal;

  try {
    const response = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.4,
        max_tokens: request.maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenAI-compatible LLM request failed: HTTP ${response.status} ${body.slice(0, 200)}`,
      );
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new Error("OpenAI-compatible LLM returned empty completion");
    }

    return {
      text,
      usage: body.usage
        ? {
            promptTokens: body.usage.prompt_tokens,
            completionTokens: body.usage.completion_tokens,
            totalTokens: body.usage.total_tokens,
          }
        : undefined,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
