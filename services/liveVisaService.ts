import { VisaType } from "../types";

const API_URL = (
  import.meta.env.VITE_VISA_API_URL ||
  "https://visacraft-jev-api-krushideep.vercel.app"
).replace(/\/$/, "");

export interface LiveVisaCheck {
  sourceCheckedAt: string;
  sourceEvidence: { title: string; url: string; excerpt?: string }[];
  jev: {
    category: string;
    probabilities?: Record<string, number>;
    confidence?: number;
    needsReview?: boolean;
    model?: string;
  };
  live?: {
    status: "verified" | "needs_review";
    reason?: string;
    sourceCount?: number;
    model?: string;
  };
}

export const fetchLiveVisaCheck = async (
  passport: string,
  destination: string,
  purpose: VisaType,
  accessCategory: string
): Promise<LiveVisaCheck | null> => {
  try {
    const response = await fetch(`${API_URL}/api/visa-check`, {
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
