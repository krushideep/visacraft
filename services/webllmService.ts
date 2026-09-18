import { CreateMLCEngine, type MLCEngine } from "@mlc-ai/web-llm";
import type { DocumentCategory } from "../types";

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

const CATEGORY_HINTS: Record<DocumentCategory, string> = {
  passport: "a passport bio page",
  financial: "a bank statement or proof-of-funds document",
  accommodation: "an accommodation booking or invitation letter",
  itinerary: "a travel itinerary or flight booking",
  insurance: "a travel insurance policy document",
  photo: "a passport-style photo",
  form: "a filled application form",
  other: "a supporting document",
};

// Reuses the same engine instance as askVisaCraft (memoized in getEngine()),
// so a user who already opened the chat assistant doesn't pay a second
// multi-hundred-MB model load. Returns the model's raw text reply; parsing
// it into a structured verdict is the caller's job (documentVerificationService).
export const verifyDocumentText = async (
  ocrText: string,
  category: DocumentCategory,
  requirementText: string
): Promise<string> => {
  const engine = await getEngine();

  const system =
    `You are a cautious document sanity-checker running entirely in the traveler's browser.\n` +
    `You will be given text extracted (via OCR) from a document the traveler uploaded, which should look like ${CATEGORY_HINTS[category]}.\n` +
    `IMPORTANT: You cannot verify authenticity, detect forgery, or confirm the document is genuine — OCR text alone can never prove that. ` +
    `Do not invent details that are not present in the text. Do not claim certainty. ` +
    `Your only job is a shallow plausibility check: does this text loosely resemble the expected kind of document?\n` +
    `Reply in exactly this format, nothing else:\n` +
    `PLAUSIBLE: yes|no|unsure\n` +
    `REASON: <one short sentence>`;

  const user =
    `Expected document for checklist requirement: "${requirementText}"\n\n` +
    `OCR-extracted text:\n${ocrText.slice(0, 3000)}`;

  const response = await engine.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.1,
    max_tokens: 150,
  });

  return response.choices[0]?.message?.content?.trim() ?? "PLAUSIBLE: unsure\nREASON: No response generated.";
};

export const preloadWebLLM = () => getEngine();
