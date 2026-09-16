import { CreateMLCEngine, type MLCEngine } from "@mlc-ai/web-llm";

const MODEL = "Llama-3.2-3B-Instruct-q4f16_1-MLC";
let enginePromise: Promise<MLCEngine> | null = null;

const getEngine = () => {
  if (!enginePromise) {
    enginePromise = CreateMLCEngine(MODEL, {
      initProgressCallback: (progress) => {
        window.dispatchEvent(new CustomEvent("visacraft:llm-progress", { detail: progress }));
      },
    });
  }
  return enginePromise;
};

export const isWebLLMSupported = () =>
  typeof navigator !== "undefined" && "gpu" in navigator;

export const askVisaCraft = async (
  message: string,
  context: { passport?: string; destination?: string; purpose?: string } = {}
) => {
  const engine = await getEngine();

  const system = `You are VisaCraft, a private browser-based travel assistant.\n` +
    `Your job is to understand the traveler's question and help explain visa information.\n` +
    `IMPORTANT: Never invent visa rules, fees, processing times, exemptions, or official URLs. ` +
    `The authoritative VisaCraft rules engine and official government sources are the source of truth. ` +
    `If a fact is not supplied in context, say that it needs verification. Keep answers concise and practical.\n` +
    `Current trip context: ${JSON.stringify(context)}`;

  const response = await engine.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: message },
    ],
    temperature: 0.2,
    max_tokens: 400,
  });

  return response.choices[0]?.message?.content?.trim() ?? "I couldn't generate a response.";
};

export const preloadWebLLM = () => getEngine();
