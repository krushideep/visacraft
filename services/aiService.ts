/// <reference types="vite/client" />

import { VisaChecklist, VisaType } from "../types";
import { EU_SCHENGEN, getCountryCode } from "../constants";

const CACHE_PREFIX = "visacraft_cache_v4_";
const CACHE_EXPIRY = 1000 * 60 * 60 * 24 * 7;

type VisaAccessCategory = "free" | "voa" | "evisa" | "required" | "unknown";

const categoryLabel: Record<VisaAccessCategory, string> = {
  free: "Visa-free access",
  voa: "Visa on arrival",
  evisa: "eVisa / online authorization",
  required: "Visa required",
  unknown: "Visa requirement needs verification",
};

const getCachedResult = (cacheKey: string): VisaChecklist | null => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_EXPIRY) return data;
    localStorage.removeItem(cacheKey);
  } catch {
    try { localStorage.removeItem(cacheKey); } catch { /* ignore storage failures */ }
  }
  return null;
};

const saveCachedResult = (cacheKey: string, data: VisaChecklist) => {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // Private browsing/storage restrictions should not prevent checklist generation.
  }
};

const baseChecklist = (
  countryFrom: string,
  countryTo: string,
  visaType: VisaType,
  category: VisaAccessCategory
): VisaChecklist => {
  const categoryText = categoryLabel[category];
  const needsApplication = category === "evisa" || category === "required" || category === "voa";

  return {
    countryFrom,
    countryTo,
    visaType,
    visaCategory: categoryText,
    estimatedProcessingTime: "Verify with the official immigration authority",
    expectedFee: "Verify current fees with the official immigration authority",
    generalRequirements: [
      "Passport meeting the destination's validity and blank-page requirements",
      "Travel purpose and dates matching the application or entry conditions",
      "Evidence supporting the stated purpose of travel",
      "Any destination-specific entry, health, insurance, or financial requirements",
    ],
    specificRequirements: category === "free"
      ? [
          "No visa application is indicated by the selected discovery dataset",
          "Confirm the permitted stay and entry conditions before travel",
          "Check whether an electronic travel authorization is separately required",
        ]
      : [
          needsApplication ? "Confirm the exact application route: online, arrival, embassy, consulate, or designated visa centre" : "Confirm the applicable entry procedure",
          "Check the destination authority's current eligibility and document requirements",
          "Verify whether an appointment, biometric enrollment, or additional authorization is required",
        ],
    financialRequirements: [
      "Check whether proof of sufficient funds is required",
      "Prepare recent bank or income evidence if the official authority requests it",
      "Do not rely on an old minimum-funds figure; verify the current amount and currency officially",
    ],
    additionalTips: [
      "VisaCraft's map is a discovery layer, not an immigration decision",
      "Rules can change after tickets are booked; verify requirements close to departure",
      "Keep copies of submitted documents and the final approval/authorization",
      "If official sources conflict, follow the competent immigration authority and contact it for clarification",
    ],
    officialLinks: [],
    applicationForms: [],
    checklistItems: [
      {
        title: "1. Passport",
        requirements: [
          "Valid passport in the traveler's name",
          "Check the destination's required validity period",
          "Check the destination's blank-page requirement",
          "Carry copies of the biographical page and relevant previous visas when appropriate",
        ],
      },
      {
        title: "2. Travel purpose",
        requirements: [
          `Purpose: ${visaType}`,
          "Prepare a concise itinerary or explanation of the planned trip",
          "Ensure dates and stated purpose are consistent across documents",
        ],
      },
      {
        title: "3. Application / entry authorization",
        requirements: category === "free"
          ? [
              "No visa application is indicated by the selected dataset",
              "Verify whether a separate electronic travel authorization or registration is required",
              "Confirm the maximum permitted stay from an official source",
            ]
          : [
              "Use only the official application route identified by the destination authority",
              "Confirm whether the process is online, on arrival, or through an embassy/consulate/visa centre",
              "Do not submit payment until the application route and fee have been verified",
            ],
      },
      {
        title: "4. Photographs and identity documents",
        requirements: [
          "Provide photographs only if the official process requires them",
          "Follow the authority's current dimensions, background, and recency rules",
          "Prepare any additional identity or civil-status documents specifically requested",
        ],
      },
      {
        title: "5. Financial evidence",
        requirements: [
          "Prepare bank statements or other financial evidence if required",
          "Use the document period and minimum amount specified by the official authority",
          "Ensure financial evidence is consistent with the stated trip duration and purpose",
        ],
      },
      {
        title: "6. Accommodation",
        requirements: [
          "Prepare accommodation details if requested",
          "For hosted stays, check whether an invitation or host documentation is required",
          "Ensure accommodation dates cover the intended stay where applicable",
        ],
      },
      {
        title: "7. Travel itinerary",
        requirements: [
          "Prepare intended arrival and departure details",
          "Check whether onward or return travel evidence is required",
          "Avoid making non-refundable bookings solely on the assumption that a visa will be granted",
        ],
      },
      {
        title: "8. Insurance and health requirements",
        requirements: [
          "Check whether travel medical insurance is mandatory",
          "Verify any required coverage, territory, and validity conditions officially",
          "Check current vaccination, health declaration, or other entry requirements if applicable",
        ],
      },
      {
        title: "9. Employment / study / ties",
        requirements: [
          "Prepare employment, study, business, or other supporting evidence when requested",
          "Check whether a leave letter, enrollment proof, invitation, or sponsor documentation applies",
          "Provide only documents specifically required by the competent authority",
        ],
      },
      {
        title: "10. Final verification",
        requirements: [
          "Verify current requirements on the destination's official immigration or foreign-affairs website",
          "Confirm fee, processing time, permitted stay, and validity before submitting",
          "Check passport, approval/authorization, and entry conditions again before departure",
        ],
      },
    ],
  };
};

export const generateVisaChecklist = async (
  countryFrom: string,
  countryTo: string,
  visaType: VisaType,
  accessCategory: VisaAccessCategory = "unknown"
): Promise<VisaChecklist> => {
  const codeFrom = getCountryCode(countryFrom);
  const codeTo = getCountryCode(countryTo);
  const cacheKey = `${CACHE_PREFIX}${codeFrom}_${codeTo}_${visaType.replace(/\s+/g, "_")}_${accessCategory}`;

  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  // Schengen is still handled locally, but without depending on a remote AI API.
  // This prevents the checklist flow from failing when a browser has no API access.
  const isSchengenTo = EU_SCHENGEN.includes(codeTo);
  const effectiveCategory = isSchengenTo && (visaType === VisaType.TOURIST || visaType === VisaType.BUSINESS)
    ? "required"
    : accessCategory;

  const result = baseChecklist(countryFrom, countryTo, visaType, effectiveCategory);
  saveCachedResult(cacheKey, result);
  return result;
};
