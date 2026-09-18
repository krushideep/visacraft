import { VisaType } from "../types";

const API_URL = (
  import.meta.env.VITE_VISA_API_URL ||
  "https://visacraft-jev-api-krushideep.vercel.app"
).replace(/\/$/, "");

export interface LiveVisaCheck {
  sourceCheckedAt: string;
  sourceEvidence: { title: string; url: string; excerpt?: string }[];
  jev: { category: string; probabilities?: Record<string, number>; confidence?: number; needsReview?: boolean; model?: string };
  live?: { status: "verified" | "needs_review"; reason?: string; sourceCount?: number; model?: string };
}

export const fetchLiveVisaCheck = async (
  passport: string, destination: string, purpose: VisaType, accessCategory: string
): Promise<LiveVisaCheck | null> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_URL}/api/visa-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passport, destination, purpose, accessCategory }),
      signal: controller.signal,
      cache: "no-store",
    });
    const raw = await response.text();
    let payload: any = null;
    try { payload = raw ? JSON.parse(raw) : null; } catch {}
    if (!response.ok) {
      const reason = payload?.live?.reason || payload?.error || raw.slice(0, 240) || "empty response";
      throw new Error(`Live API HTTP ${response.status}: ${reason}`);
    }
    if (!payload || typeof payload !== "object") throw new Error("Live API returned an invalid response.");
    return payload as LiveVisaCheck;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") throw new Error("Live API timeout after 20 seconds.");
      throw error;
    }
    throw new Error("Live API request failed.");
  } finally {
    window.clearTimeout(timeout);
  }
};
