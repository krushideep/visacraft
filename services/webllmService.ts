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

// Extracts processing time / fee entirely on-device from official-source
// evidence text already fetched by the Jev API. This exists because the
// server-side Jev question schema only supports noul/choice/score/
// bounding_box (no free-text extraction — confirmed via a live 422), and a
// regex-based approach over the same evidence was unreliable on real pages
// (matched a visa-exemption stay-duration clause instead of processing
// time, and the wrong row of a multi-category fee table). Running the
// extraction as a targeted, single-field-at-a-time LLM read locally keeps
// the "never guess" rule intact: the model is told to reply NOT_STATED
// rather than infer, and the caller only accepts a value from the strict
// expected format.
export const extractProcessingTimeAndFee = async (
  evidenceText: string,
  destination: string
): Promise<{ processingTime?: string; fee?: string }> => {
  const engine = await getEngine();

  const system =
    `You are a precise extraction tool running entirely in the traveler's browser.\n` +
    `You will be given text scraped from an official government/embassy source about a visa to ${destination}.\n` +
    `IMPORTANT: Only report a value if it is EXPLICITLY and UNAMBIGUOUSLY stated in the text as the visa processing time or the visa fee. ` +
    `Never infer, estimate, or reuse a number that describes something else (e.g. permitted stay duration, validity period, unrelated fees). ` +
    `If there are multiple visa categories with different fees/times and it isn't clear which one applies, reply NOT_STATED for that field. ` +
    `When genuinely unstated or ambiguous, you MUST reply NOT_STATED — never guess.\n` +
    `Reply in exactly this format, nothing else, no explanation:\n` +
    `PROCESSING_TIME: <value or NOT_STATED>\n` +
    `FEE: <value or NOT_STATED>`;

  const user = `Source text:\n${evidenceText.slice(0, 6000)}`;

  const response = await engine.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0,
    max_tokens: 100,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "";
  const timeMatch = text.match(/PROCESSING_TIME:\s*(.+)/i);
  const feeMatch = text.match(/FEE:\s*(.+)/i);
  const clean = (raw?: string) => {
    const value = raw?.split("\n")[0]?.trim();
    if (!value || /^NOT_STATED$/i.test(value)) return undefined;
    return value;
  };

  return {
    processingTime: clean(timeMatch?.[1]),
    fee: clean(feeMatch?.[1]),
  };
};
