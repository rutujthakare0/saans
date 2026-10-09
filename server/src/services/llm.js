import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config.js';

let client;
export async function draftWithModel(facts) {
  if (config.llmProvider !== 'bedrock') return null;
  try {
    client ||= new BedrockRuntimeClient({ region: config.awsRegion });
    const prompt = `Write a brief bilingual notice informing parents about school arrangements. Return only JSON with keys en and hi. Do not instruct parents to keep a child home or imply the school is closed. Explain that outdoor assembly, PE and outdoor break are cancelled or limited; when cancelled, students stay indoors at school. State that the school remains open as planned unless the school says otherwise. Include the exact AQI number, the modelled-estimate disclaimer, and exact outdoor window times when present. Use calm parent-facing statements, not instructions to staff. Do not change or weaken these fixed facts: ${JSON.stringify(facts)}`;
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
