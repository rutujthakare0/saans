import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config.js';

let client;
export async function draftWithModel(facts) {
  if (config.llmProvider !== 'bedrock') return null;
  try {
    client ||= new BedrockRuntimeClient({ region: config.awsRegion });
    const prompt = `Write a brief school parent notice in English and Hindi from these fixed facts. Do not change or weaken the action. Return only JSON with keys en and hi.\n${JSON.stringify(facts)}`;
    const response = await client.send(new ConverseCommand({
      modelId: config.bedrockModelId,
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 500, temperature: 0.2 }
    }));
    const text = response.output?.message?.content?.find(item => item.text)?.text;
    return JSON.parse(text?.replace(/^```json\s*|\s*```$/g, '') || 'null');
  } catch (error) {
    console.warn(`Bedrock wording unavailable; using fixed notice: ${error.message}`);
    return null;
  }
}
