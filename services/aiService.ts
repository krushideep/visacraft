/// <reference types="vite/client" />

import { VisaChecklist, VisaType } from "../types";
import { EU_SCHENGEN, getCountryCode } from "../constants";

const CACHE_PREFIX = "visacraft_cache_v1_";
const CACHE_EXPIRY = 1000 * 60 * 60 * 24 * 7; // 7 days
const API_ENDPOINT = "https://models.inference.ai.azure.com/chat/completions";
const MODEL = "gpt-4o";
const MAX_TOKENS = 1500;

// Fast-path response for Schengen travel
const getSchengenResponse = (
  countryFrom: string,
  countryTo: string,
  visaType: VisaType
): VisaChecklist => ({
  countryFrom,
  countryTo,
  visaType,
  visaCategory: "Visa Free (Schengen)",
  estimatedProcessingTime: "Instant",
  expectedFee: "Free",
  generalRequirements: [
    "Valid National ID card or Passport",
    "No visa required for stays up to 90 days",
    "Freedom of movement within Schengen Area"
  ],
  specificRequirements: [
    "Valid travel document",
    "EHIC card recommended for healthcare"
  ],
  financialRequirements: ["Formal proof not required for EU/EEA citizens"],
  additionalTips: [
    "90-day limit applies per 180-day period",
    "Register if staying longer than 3 months"
  ],
  officialLinks: [
    { 
      title: "EU Travel Advice", 
      url: "https://europa.eu/youreurope/citizens/travel/index_en.htm" 
    }
  ],
  applicationForms: []
});

// Retrieve cached result if valid
const getCachedResult = (cacheKey: string): VisaChecklist | null => {
  const cached = localStorage.getItem(cacheKey);
  if (!cached) return null;
  
  try {
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_EXPIRY) {
      return data;
    }
  } catch {
    localStorage.removeItem(cacheKey);
  }
  return null;
};

// Call GitHub Models API (gpt-4o via OpenAI-compatible endpoint)
const callGitHubModelsAPI = async (
  countryFrom: string,
  countryTo: string,
  visaType: VisaType,
  token: string
): Promise<string> => {
  const systemPrompt = `You are an expert in international visa requirements. Provide accurate visa info based on current official policies. Respond ONLY with valid JSON - no markdown or extra text.`;

  const userPrompt = `Provide visa requirements for ${countryFrom} citizen → ${countryTo} (${visaType}).
Return ONLY this JSON:
{
  "countryFrom": "${countryFrom}",
  "countryTo": "${countryTo}",
  "visaType": "${visaType}",
  "visaCategory": "Visa type",
  "estimatedProcessingTime": "Days or 'Immediate'",
  "expectedFee": "Amount or 'Free'",
  "generalRequirements": ["requirement1", "requirement2"],
  "specificRequirements": ["requirement1"],
  "financialRequirements": ["requirement1"],
  "additionalTips": ["tip1"],
  "applicationForms": [{"title": "Form", "url": "https://example.com"}],
  "officialLinks": [{"title": "Link", "url": "https://example.com"}]
}`;

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub Models API (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
};

export const generateVisaChecklist = async (
  countryFrom: string,
  countryTo: string,
  visaType: VisaType
): Promise<VisaChecklist> => {
  const codeFrom = getCountryCode(countryFrom);
  const codeTo = getCountryCode(countryTo);
  const cacheKey = `${CACHE_PREFIX}${codeFrom}_${codeTo}_${visaType.replace(/\s+/g, '_')}`;

  // 1. Schengen fast-path (no API call needed)
  const isSchengenFrom = EU_SCHENGEN.includes(codeFrom);
  const isSchengenTo = EU_SCHENGEN.includes(codeTo);
  if (isSchengenFrom && isSchengenTo && 
      (visaType === VisaType.TOURIST || visaType === VisaType.BUSINESS)) {
    return getSchengenResponse(countryFrom, countryTo, visaType);
  }

  // 2. Check cache
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  // 3. Call GitHub Models API
  try {
    const token = import.meta.env.VITE_GITHUB_TOKEN;
    if (!token) {
      throw new Error("GitHub token not configured. Set VITE_GITHUB_TOKEN in .env.local");
    }

    const responseText = await callGitHubModelsAPI(countryFrom, countryTo, visaType, token);

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("API response contained no JSON");
    }

    const parsedData = JSON.parse(jsonMatch[0]) as VisaChecklist;
    
    // Cache result
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ timestamp: Date.now(), data: parsedData })
    );

    return parsedData;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Visa checklist generation failed: ${message}`);
  }
};
