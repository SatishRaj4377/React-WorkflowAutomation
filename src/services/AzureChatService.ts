import axios from 'axios';

export type AzureChatConfig = {
  endpoint: string;         // e.g. https://<your-resource>.openai.azure.com
  key: string;              // Azure OpenAI API key
  deploymentName: string;   // model/deployment (e.g. gpt-4o-mini, gpt-4o, etc.)
  temperature?: number;     // optional (defaults to 0.7)
};

/**
 * Sends a single-turn prompt to Azure OpenAI Chat Completions API and returns the text.
 * Uses the 2024-02-15-preview API.
 */
export async function generateResponse(
  prompt: string,
  config: AzureChatConfig
): Promise<{ text: string; raw: any; temperature: number }> {
  const { endpoint, key, deploymentName, temperature = 0.7 } = config;
  const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;

  const response = await axios.post(
    url,
    {
      messages: [{ role: 'user', content: prompt }],
      temperature
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'api-key': key
      }
    }
  );

  const text = response.data?.choices?.[0]?.message?.content ?? 'No response.';
  return { text, raw: response.data, temperature };
}