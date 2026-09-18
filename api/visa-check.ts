import { VISA_SOURCES } from "../services/visaSources.js";

type RequestBody = {
  passport?: string;
  destination?: string;
  purpose?: string;
  accessCategory?: string;
};

type Evidence = { title: string; url: string; excerpt?: string };

const stripHtml = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (text: string, max = 5000) =>
  text.length <= max ? text : text.slice(0, max) + "…";

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

// Extracts a plain string from an answer whose shape varies by question type
// (seen so far: raw string, {value}, {text}, {choice}). Treats an empty or
// whitespace-only result as "not stated" (undefined) rather than displaying
// a blank value — the model is instructed to reply empty when the evidence
// doesn't clearly state the field, never to guess.
const extractText = (answer: any): string | undefined => {
  const raw = answer?.text ?? answer?.value ?? answer?.choice ?? (typeof answer === "string" ? answer : undefined);
  const trimmed = typeof raw === "string" ? raw.trim() : undefined;
  return trimmed ? trimmed : undefined;
};

const extractJev = (payload: any) => {
  const root = payload?.answers ?? payload?.decisions ?? payload?.result ?? payload;
  const visaAnswer = root?.visaCategory;
  const reviewAnswer = root?.needsReview;

  const category =
    visaAnswer?.choice ??
    visaAnswer?.value ??
    visaAnswer ??
    "needs_review";

  const reviewProbability =
    typeof reviewAnswer?.noul === "number"
      ? reviewAnswer.noul
      : typeof reviewAnswer?.value === "number"
        ? reviewAnswer.value
        : typeof reviewAnswer === "number"
          ? reviewAnswer
          : undefined;

  return {
    category,
    probabilities: visaAnswer?.probabilities,
    confidence:
      typeof visaAnswer?.confidence === "number"
        ? visaAnswer.confidence
        : undefined,
    needsReview:
      reviewProbability != null
        ? reviewProbability >= 0.5
        : Boolean(reviewAnswer),
    processingTime: extractText(root?.processingTime),
    fee: extractText(root?.fee),
    model: payload?.model,
  };
};

const callJev = async (state: unknown) => {
  const key = process.env.TYPESAFE_API_KEY ?? process.env.JEV_API_KEY;
  if (!key) return { raw: null, error: "missing_api_key" };

  try {
    const response = await fetchWithTimeout(
      "https://api.typesafe.ai/v1/systemone",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "jev-latest",
          state,
          questions: {
            visaCategory: {
              type: "choice",
              instructions:
                "Classify the visa access route for the stated passport, destination and purpose using only the supplied official-source evidence. Choose needs_review when evidence is missing, contradictory, or ambiguous.",
              criteria: {
                visa_free:
                  "Official evidence indicates no visa is required for this passport and purpose.",
                visa_on_arrival:
                  "Official evidence indicates a visa or entry permit can be obtained on arrival.",
                evisa_or_online:
                  "Official evidence indicates an electronic visa or online authorization is required or available.",
                visa_required:
                  "Official evidence indicates an advance visa/application is required.",
                needs_review:
                  "The supplied evidence is insufficient, contradictory, or does not clearly establish the route.",
              },
            },
            needsReview: {
              type: "noul",
              instructions:
                "Should this case be reviewed rather than automatically treated as a confirmed visa rule?",
            },
            processingTime: {
              type: "text",
              instructions:
                "Extract the typical visa processing time or turnaround stated in the official-source evidence, concisely (e.g. '3-5 business days'). Reply with an empty string if the evidence does not clearly state a processing time — never estimate or guess.",
            },
            fee: {
              type: "text",
              instructions:
                "Extract the visa fee or cost stated in the official-source evidence, concisely, with currency (e.g. 'USD 40' or 'THB 2000'). Reply with an empty string if the evidence does not clearly state a fee — never estimate or guess.",
            },
          },
        }),
      },
      12000
    );

    const text = await response.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error("jev_http_error", response.status, text.slice(0, 2000));
      return {
        raw: null,
        error: `jev_http_${response.status}`,
      };
    }

    if (!payload) return { raw: null, error: "jev_invalid_json" };
    return { raw: payload, error: null };
  } catch (error) {
    return {
      raw: null,
      error: error instanceof Error && error.name === "AbortError"
        ? "jev_timeout"
        : "jev_network_error",
    };
  }
};

export default async function handler(req: any, res: any) {
  // This endpoint is intentionally public and uses no cookies/auth from the browser.
  // Allow the static VisaCraft frontend from GitHub Pages, custom domains and previews.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "visacraft-jev-api",
      jevConfigured: Boolean(process.env.TYPESAFE_API_KEY ?? process.env.JEV_API_KEY),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = (req.body ?? {}) as RequestBody;
  if (!body.passport || !body.destination || !body.purpose) {
    return res.status(400).json({
      error: "passport, destination and purpose are required",
    });
  }

  const passportCode =
    body.passport.length === 2 ? body.passport.toUpperCase() : body.passport;
  const destinationCode =
    body.destination.length === 2
      ? body.destination.toUpperCase()
      : body.destination;
  const sources = VISA_SOURCES[destinationCode] ?? [];

  if (!sources.length) {
    return res.status(200).json({
      sourceCheckedAt: new Date().toISOString(),
      sourceEvidence: [],
      jev: { category: "needs_review", needsReview: true },
      live: {
        status: "needs_review",
        reason: "no_official_sources_configured",
      },
    });
  }

  const results = await Promise.all(
    sources.slice(0, 3).map(async (source): Promise<Evidence | null> => {
      try {
        const sourceResponse = await fetchWithTimeout(
          source.url,
          {
            headers: {
              "User-Agent": "VisaCraft/1.0",
              Accept: "text/html,application/xhtml+xml",
            },
          },
          6000
        );

        if (!sourceResponse.ok) return null;

        const html = await sourceResponse.text();
        return {
          title: source.title,
          url: source.url,
          excerpt: truncate(stripHtml(html)),
        };
      } catch {
        return null;
      }
    })
  );

  const evidence = results.filter(Boolean) as Evidence[];

  const state = {
    traveler: {
      passport: passportCode,
      destination: destinationCode,
      purpose: body.purpose,
    },
    discoveryCategory: body.accessCategory ?? "unknown",
    officialSources: evidence,
  };

  const jevResult = await callJev(state);

  if (!jevResult.raw) {
    return res.status(200).json({
      sourceCheckedAt: new Date().toISOString(),
      sourceEvidence: evidence,
      jev: { category: "needs_review", needsReview: true },
      live: {
        status: "needs_review",
        reason: jevResult.error ?? "jev_unavailable",
        sourceCount: evidence.length,
      },
    });
  }

  const jev = extractJev(jevResult.raw);

  return res.status(200).json({
    sourceCheckedAt: new Date().toISOString(),
    sourceEvidence: evidence,
    jev,
    live: {
      status: jev.needsReview ? "needs_review" : "verified",
      sourceCount: evidence.length,
      model: jev.model,
    },
  });
}
