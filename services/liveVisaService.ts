import { VisaType } from "../types";

export interface LiveVisaCheck {
  sourceCheckedAt: string;
  sourceEvidence: { title: string; url: string; excerpt?: string }[];
  jev: {
    category: string;
    probabilities?: Record<string, number>;
    confidence?: number;
    needsReview?: boolean;
  };
}

export const fetchLiveVisaCheck = async (
  passport: string,
  destination: string,
  purpose: VisaType,
  accessCategory: string
): Promise<LiveVisaCheck | null> => {
  try {
    const response = await fetch("/api/visa-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passport, destination, purpose, accessCategory }),
    });
    if (!response.ok) return null;
    return await response.json() as LiveVisaCheck;
  } catch {
    return null;
  }
};
