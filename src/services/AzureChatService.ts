import axios, { AxiosError } from 'axios';
import { AgentMessage, AgentTurnOptions, AgentTurnResult, AzureChatConfig } from '../types';

/** Simple chat-only generation; keeps your current behavior intact. */
export async function generateResponse(
  prompt: string,
  config: AzureChatConfig
): Promise<{ text: string; raw: any; temperature: number }> {
  const { endpoint, key, deploymentName, temperature = 0.7 } = config;
  const url =
    `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;

  const response = await axios.post(
    url,
    { messages: [{ role: 'user', content: prompt }], temperature },
    { headers: { 'Content-Type': 'application/json', 'api-key': key } }
  );

  const text = response.data?.choices?.[0]?.message?.content ?? 'No response.';
  return { text, raw: response.data, temperature };
}

export async function generateAgentTurn(
  messages: AgentMessage[],
  config: AzureChatConfig,
  opts: AgentTurnOptions = {}
): Promise<AgentTurnResult> {
  const { endpoint, key, deploymentName, temperature = 0.7 } = config;
  const apiVersion = opts.apiVersionOverride ?? '2024-02-15-preview';
  const url =
    `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

  const body: any = { messages, temperature };

  const haveTools = Array.isArray(opts.tools) && opts.tools.length > 0;
  if (haveTools) body.tools = opts.tools;

  // IMPORTANT: tool_choice can only be sent when tools are present
  if (haveTools && opts.toolChoice) body.tool_choice = opts.toolChoice;

  // Only include response_format on newer API versions (optional)
  if (opts.responseFormatJsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: opts.responseFormatJsonSchema.name,
        strict: opts.responseFormatJsonSchema.strict ?? true,
        schema: opts.responseFormatJsonSchema.schema,
      },
    };
  }

  try {
    const res = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json', 'api-key': key },
    });
    const choice = res.data?.choices?.[0];
    const message = choice?.message ?? { role: 'assistant', content: '' };
    return { message, raw: res.data };

  } catch (e) {
    const err = e as AxiosError<any>;
    const res = err.response;
    const data = res?.data;

    // Helpful headers for Azure support
    const headers = res?.headers ?? {};
    const requestId = headers['x-request-id'] || headers['apim-request-id'] || data?.error?.request_id;

    // eslint-disable-next-line no-console
    console.error('Azure Chat API error', {
      status: res?.status,
      requestId,
      apiVersion,
      endpoint,
      deploymentName,
      bodyPreview: JSON.stringify(body).slice(0, 4000), // don't flood logs
      error: data ?? err.message,
    });

    // Surface friendly message + keep original text available in console
    const message =
      data?.error?.message ||
      (typeof data === 'string' ? data : err.message) ||
      'Azure Chat API request failed';
    throw new Error(message);
  }

}