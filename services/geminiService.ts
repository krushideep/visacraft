import { GoogleGenAI, Type } from "@google/genai";
import { VisaChecklist, VisaType } from "../types";
import { EU_SCHENGEN, getCountryCode } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const CACHE_PREFIX = "visacraft_cache_v1_";
const CACHE_EXPIRY = 1000 * 60 * 60 * 24 * 7; // 7 days

export const generateVisaChecklist = async (
  countryFrom: string,
  countryTo: string,
  visaType: VisaType
): Promise<VisaChecklist> => {
  const codeFrom = getCountryCode(countryFrom);
  const codeTo = getCountryCode(countryTo);
  const cacheKey = `${CACHE_PREFIX}${codeFrom}_${codeTo}_${visaType.replace(/\s+/g, '_')}`;

  // 1. Static Rules (Fast Pass)
  const isSchengenFrom = EU_SCHENGEN.includes(codeFrom);
  const isSchengenTo = EU_SCHENGEN.includes(codeTo);

  if (isSchengenFrom && isSchengenTo && (visaType === VisaType.TOURIST || visaType === VisaType.BUSINESS)) {
    return {
      countryFrom,
      countryTo,
      visaType,
      visaCategory: "Visa Free (Schengen)",
      estimatedProcessingTime: "Instant",
      expectedFee: "Free",
      generalRequirements: [
        "Valid National ID card or Passport",
        "No visa required for stays up to 90 days",
        "Freedom of movement within Schengen"
      ],
      specificRequirements: [
        "Valid travel document",
        "EHIC card recommended"
      ],
      financialRequirements: ["Formal proof not required for EU citizens"],
      additionalTips: [
        "Freedom of movement applies",
        "Check local registration if staying >90 days"
      ],
      officialLinks: [{ title: "EU Travel Advice", url: "https://europa.eu/youreurope/citizens/travel/index_en.htm" }],
      applicationForms: []
    };
  }

  // 2. Cache check
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY) return parsed.data;
    } catch (e) { localStorage.removeItem(cacheKey); }
  }

  // 3. Optimized AI prompt
  const prompt = `Visa requirements: Citizen of ${countryFrom} to ${countryTo} (${visaType}). Concise JSON output.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          countryFrom: { type: Type.STRING },
          countryTo: { type: Type.STRING },
          visaType: { type: Type.STRING },
          estimatedProcessingTime: { type: Type.STRING },
          expectedFee: { type: Type.STRING },
          visaCategory: { type: Type.STRING },
          generalRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
          specificRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
          financialRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
          additionalTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          applicationForms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { title: { type: Type.STRING }, url: { type: Type.STRING } },
              required: ["title", "url"]
            }
          },
          officialLinks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { title: { type: Type.STRING }, url: { type: Type.STRING } },
              required: ["title", "url"]
            }
          }
        },
        required: [
          "countryFrom", "countryTo", "visaType", "estimatedProcessingTime", "expectedFee",
          "visaCategory", "generalRequirements", "specificRequirements", "financialRequirements",
          "additionalTips", "applicationForms", "officialLinks"
        ]
      }
    }
  });

  const data = JSON.parse(response.text) as VisaChecklist;
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
  return data;
};
