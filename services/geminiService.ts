/// <reference types="vite/client" />

import { VisaChecklist, VisaType } from "../types";
import { EU_SCHENGEN, getCountryCode } from "../constants";

const CACHE_PREFIX = "visacraft_cache_v3_";
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
  visaCategory: "Schengen Visa (Short-stay)",
  estimatedProcessingTime: "15-45 Calendar Days",
  expectedFee: "80 EUR (approx. 7200 INR)",
  generalRequirements: [
    "Valid Passport (6 months validity, 2 blank pages)",
    "Visa Application Form (completed and signed)",
    "Recent Passport Photos (35x45mm, white background, 80% face)",
    "Flight Reservation (round-trip itinerary)",
    "Proof of Accommodation (hotel booking or invitation)"
  ],
  specificRequirements: [
    "Travel Medical Insurance (min. €30,000 coverage)",
    "Proof of Employment/Study (NOC, salary slips, enrollment)",
    "Cover Letter explaining purpose and itinerary"
  ],
  financialRequirements: [
    "Bank Statements (last 3-6 months, stamped/signed)",
    "Income Tax Returns (last 3 years)",
    "Minimum funds: €45/day/person"
  ],
  additionalTips: [
    "Signatures must match passport exactly",
    "Provide clear copies of previous Schengen visas",
    "Marriage/Birth certificates for civil status proof"
  ],
  officialLinks: [
    {
      title: "EU Travel Advice",
      url: "https://europa.eu/youreurope/citizens/travel/index_en.htm"
    }
  ],
  applicationForms: [
    {
      title: "Schengen Visa Application Form",
      url: "https://ec.europa.eu/home-affairs/sites/default/files/what-we-do/policies/borders-and-visas/visa-policy/docs/application_form_en.pdf"
    }
  ],
  checklistItems: [
    {
      title: "Passport",
      requirements: [
        "Valid for at least 6 months beyond intended stay",
        "At least 2 blank visa pages",
        "Original passport required",
        "Copies of the biographical page and any previous Schengen visas",
        "Previous passport if applicable"
      ]
    },
    {
      title: "Visa Application Form",
      requirements: [
        "Completed and signed Schengen visa application form",
        "Ensure all sections are filled out accurately and truthfully",
        "Signatures must match passport signature"
      ]
    },
    {
      title: "Photographs",
      requirements: [
        "2 recent passport-sized photos",
        "35mm x 45mm dimensions",
        "White background",
        "Taken within the last 6 months",
        "80% face coverage",
        "Neutral facial expression, no headgear unless for religious reasons"
      ]
    },
    {
      title: "Proof of Financial Means",
      requirements: [
        "Last 3-6 months bank statements with sufficient funds",
        "Bank statements must be stamped and signed by the bank",
        "Minimum balance of EUR 45 (approx. 4000 INR) per day of stay",
        "Proof of regular income such as salary slips or pension statements",
        "Income Tax Returns (ITR) for the last 2-3 years"
      ]
    },
    {
      title: "Flight Reservation",
      requirements: [
        "Round-trip flight booking (itinerary only, do not purchase tickets)",
        "Confirmed travel dates matching the intended duration of stay",
        "Booking confirmation with Passenger Name Record (PNR)"
      ]
    },
    {
      title: "Hotel Booking/Accommodation",
      requirements: [
        "Proof of confirmed hotel reservation for entire stay",
        "Name, complete address, and contact details of the hotel",
        "If staying with a host, provide an invitation letter from the host",
        "Host's legal residence permit or passport copy if applicable",
        "Proof of host’s address (e.g., utility bill, rental agreement)"
      ]
    },
    {
      title: "Travel Insurance",
      requirements: [
        "Coverage of at least EUR 30,000 (approx. 2,600,000 INR)",
        "Covers entire duration of stay in the Schengen Area",
        "Must include medical emergencies, accidents, and repatriation",
        "Certificate must include policy number and insured details"
      ]
    },
    {
      title: "Cover Letter",
      requirements: [
        "Purpose of visit explained",
        "Details of travel itinerary",
        "Duration of stay and return plan",
        "Contact details of applicant"
      ]
    },
    {
      title: "Proof of Civil Status",
      requirements: [
        "Marriage certificate (if applicable)",
        "Birth certificate (if applicable)",
        "Proof of family ties in India/Home country (if applicable)"
      ]
    },
    {
      title: "Proof of Employment",
      requirements: [
        "No-objection certificate (NOC) from employer",
        "Details of employment such as position, salary, and duration",
        "Leave approval for travel dates",
        "If self-employed, company registration documents and GST registration"
      ]
    }
  ]
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
  const systemPrompt = `You are an expert in international visa requirements and government policy analysis. Provide accurate, detailed visa documentation requirements. Your primary goal is to ensure the traveler has the exact URLs for official government visa policies, consulate locations, and application portals. Responses must be extremely thorough, following the exact structure provided.`;

  const userPrompt = `Provide a comprehensive visa checklist for ${countryFrom} citizen traveling to ${countryTo} for ${visaType} purposes.
The response MUST follow this exact JSON structure and include a detailed 'checklistItems' array with exactly 10 comprehensive sections (like Passport, Photos, Finance, Flight, Accommodation, Insurance, etc.).

{
  "countryFrom": "${countryFrom}",
  "countryTo": "${countryTo}",
  "visaType": "${visaType}",
  "visaCategory": "Category Name",
  "estimatedProcessingTime": "X-Y Business Days",
  "expectedFee": "Currency/Amount info",
  "generalRequirements": ["brief summary 1", "brief summary 2"],
  "specificRequirements": ["specific detail 1"],
  "financialRequirements": ["finance detail 1"],
  "additionalTips": ["helpful tip 1"],
  "applicationForms": [{"title": "Form Name", "url": "URL if known"}],
  "officialLinks": [
    {"title": "Official Consulate/Embassy Site", "url": "URL"},
    {"title": "Ministry of Foreign Affairs Policy", "url": "URL"},
    {"title": "Schengen/Regional Border Policy (if applicable)", "url": "URL"}
  ],
  "checklistItems": [
    {
      "title": "1. Passport",
      "requirements": ["requirement detail 1", "requirement detail 2"]
    },
    ... (exactly 10 detailed sections)
  ]
}

Ensure the requirements are as detailed as possible (e.g. mention specific photo dimensions, bank statement duration, etc.). Respond ONLY with valid JSON.`;

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
  if (isSchengenTo &&
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
