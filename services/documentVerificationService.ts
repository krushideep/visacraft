import type { DocumentCategory, DocumentVerificationResult } from "../types";
import { extractMrzLines, parseMrz, validateMrzChecksums } from "./mrzService";
import { verifyDocumentText, isWebLLMSupported } from "./webllmService";

// Order matters: more specific categories (e.g. "passport photo" is a photo
// requirement, not the passport document itself) must be checked before the
// broader keyword they'd otherwise also match.
const CATEGORY_KEYWORDS: [DocumentCategory, RegExp][] = [
  ["photo", /photo/i],
  ["passport", /passport/i],
  ["financial", /bank|statement|funds|sponsor|financial/i],
  ["accommodation", /hotel|accommodation|booking|invitation|host/i],
  ["itinerary", /itinerary|flight|ticket|onward|return travel/i],
  ["insurance", /insurance|medical cover|coverage/i],
  ["form", /application form|form\b/i],
];

export const inferDocumentCategory = (requirementOrSectionTitle: string): DocumentCategory => {
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(requirementOrSectionTitle)) return category;
  }
  return "other";
};

export const verifyPassportText = (
  ocrText: string,
  inputMode: DocumentVerificationResult["inputMode"] = "ocr"
): DocumentVerificationResult => {
  const checkedAt = new Date().toISOString();
  const lines = extractMrzLines(ocrText);

  if (!lines) {
    return {
      status: "needs_review",
      method: "mrz",
      category: "passport",
      checkedAt,
      confidence: 0,
      summary: "Couldn't locate a machine-readable zone in this text. Try a clearer photo of the bio page, or enter the two MRZ lines manually.",
      inputMode,
    };
  }

  const parsed = parseMrz(lines.line1, lines.line2);
  if (!parsed) {
    return {
      status: "needs_review",
      method: "mrz",
      category: "passport",
      checkedAt,
      confidence: 0,
      summary: "Found MRZ-like lines but couldn't parse them reliably. Please review and correct the text.",
      inputMode,
    };
  }

  const validation = validateMrzChecksums(parsed);
  const fields = {
    passportNumber: parsed.passportNumber,
    surname: parsed.surname,
    givenNames: parsed.givenNames,
    nationality: parsed.nationality,
    dob: parsed.dob,
    expiry: parsed.expiry,
  };

  // Checksum failure is checked first and always surfaced, even on an expired
  // document — an expired-and-corrupted MRZ must not be reported as merely "expired".
  if (!validation.valid) {
    const failedFields = Object.entries(validation.fieldResults)
      .filter(([, ok]) => !ok)
      .map(([field]) => field);
    return {
      status: "failed",
      method: "mrz",
      category: "passport",
      checkedAt,
      confidence: 1,
      summary: "MRZ checksum mismatch — one or more fields don't validate against their check digits.",
      fields,
      concerns: [
        ...failedFields.map((f) => `checksum mismatch: ${f}`),
        ...(validation.expired ? ["expiry date is also in the past"] : []),
      ],
      inputMode,
    };
  }

  if (validation.expired) {
    return {
      status: "expired",
      method: "mrz",
      category: "passport",
      checkedAt,
      confidence: 1,
      summary: `Passport MRZ checksums are consistent, but the expiry date (${parsed.expiry}) is in the past.`,
      fields,
      concerns: ["expiry date is in the past"],
      inputMode,
    };
  }

  return {
    status: "verified",
    method: "mrz",
    category: "passport",
    checkedAt,
    confidence: 1,
    summary: "Verified — MRZ checksums match and the passport is not expired.",
    fields,
    inputMode,
  };
};

const parseLlmVerdict = (raw: string): { plausible: "yes" | "no" | "unsure"; reason: string } => {
  const plausibleMatch = raw.match(/PLAUSIBLE:\s*(yes|no|unsure)/i);
  const reasonMatch = raw.match(/REASON:\s*(.+)/i);
  return {
    plausible: (plausibleMatch?.[1]?.toLowerCase() as "yes" | "no" | "unsure") ?? "unsure",
    reason: reasonMatch?.[1]?.trim() ?? "No specific reason given.",
  };
};

export const verifyGenericDocument = async (
  ocrText: string,
  category: DocumentCategory,
  requirementText: string,
  inputMode: DocumentVerificationResult["inputMode"] = "ocr"
): Promise<DocumentVerificationResult> => {
  const checkedAt = new Date().toISOString();

  if (category === "photo") {
    return {
      status: "needs_review",
      method: "unattempted",
      category,
      checkedAt,
      confidence: 0,
      summary: "Automated check not available for this item — photo compliance (background, size) needs a vision model we don't run locally yet.",
      inputMode,
    };
  }

  if (!isWebLLMSupported()) {
    return {
      status: "needs_review",
      method: "unattempted",
      category,
      checkedAt,
      confidence: 0,
      summary: "AI sanity check unavailable in this browser (requires WebGPU). You can still review the text yourself.",
      inputMode,
    };
  }

  if (!ocrText.trim() || ocrText.trim().length < 10) {
    return {
      status: "needs_review",
      method: "unattempted",
      category,
      checkedAt,
      confidence: 0,
      summary: "Not enough text was read from this document to check anything meaningful.",
      inputMode,
    };
  }

  try {
    const raw = await verifyDocumentText(ocrText, category, requirementText);
    const { plausible, reason } = parseLlmVerdict(raw);

    const status: DocumentVerificationResult["status"] =
      plausible === "yes" ? "verified" : plausible === "no" ? "failed" : "needs_review";

    return {
      status,
      method: "llm_sanity_check",
      category,
      checkedAt,
      // Never surface the model's own confidence as calibrated — cap low regardless of verdict.
      confidence: plausible === "yes" ? 0.4 : 0.2,
      summary:
        (plausible === "yes"
          ? "Looks like a match (unverified). "
          : plausible === "no"
            ? "Doesn't look like the expected document (unverified). "
            : "Couldn't tell from the text alone (unverified). ") + reason,
      concerns: plausible !== "yes" ? [reason] : undefined,
      inputMode,
    };
  } catch {
    return {
      status: "needs_review",
      method: "unattempted",
      category,
      checkedAt,
      confidence: 0,
      summary: "The local AI sanity check failed to run. You can still review the text yourself.",
      inputMode,
    };
  }
};
