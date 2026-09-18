import { VISA_SOURCES } from "../services/visaSources";

type RequestBody = {
  passport?: string;
  destination?: string;
  purpose?: string;
  accessCategory?: string;
};

const stripHtml = (html: string) =>
  html
    .replace(/<script[\\s\\S]*?<\\/script>/gi, " ")
    .replace(/<style[\\s\\S]*?<\\/style>/gi, " ")
    .replace(/<noscript[\\s\\S]*?<\\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\\s+/g, " ")
    .trim();

const truncate = (text: string, max = 18000) =>
  text.length <= max ? text : text.slice(0, max) + "…";

const extractJev = (payload: any) => {
  const root = payload?.answers ?? payload?.decisions ?? payload?.result ?? payload;
  const answer = (name: string) => root?.[name];
  const value = (name: string) => answer(name)?.value ?? answer(name)?.choice ?? answer(name);
  const visaAnswer = answer("visaCategory");
  const reviewAnswer = answer("needsReview");
  const reviewProbability = typeof reviewAnswer === "number"
    ? reviewAnswer
    : reviewAnswer?.value;
  return {
    category: value("visaCategory") ?? "needs_review",
    probabilities: visaAnswer?.probabilities,
    confidence: typeof visaAnswer?.confidence === "number" ? visaAnswer.confidence : undefined,
    needsReview: typeof reviewProbability === "number" ? reviewProbability >= 0.5 : Boolean(reviewProbability),
  };
};

const callJev = async (state: unknown) => {
  const key = process.env.TYPESAFE_API_KEY ?? process.env.JEV_API_KEY;
  if (!key) return null;

  const response = await fetch("https://api.typesafe.ai/v1/systemone", {
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
          instructions: "Classify the visa access route for the stated passport, destination and purpose using only the supplied official-source evidence. Choose needs_review when evidence is missing, contradictory, or ambiguous.",
          criteria: {
            visa_free: "Official evidence indicates no visa is required for this passport and purpose.",
            visa_on_arrival: "Official evidence indicates a visa or entry permit can be obtained on arrival.",
            evisa_or_online: "Official evidence indicates an electronic visa or online authorization is required or available.",
            visa_required: "Official evidence indicates an advance visa/application is required.",
            needs_review: "The supplied evidence is insufficient, contradictory, or does not clearly establish the route."
          }
        },
        needsReview: {
          type: "noul",
          instructions: "Should this case be reviewed rather than automatically treated as a confirmed visa rule?"
        }
      }
    }),
  });

  if (!response.ok) return null;
  return response.json();
};

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "https://krushideep.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "visacraft-jev-api",
      jevConfigured: Boolean(process.env.TYPESAFE_API_KEY ?? process.env.JEV_API_KEY),
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = (req.body ?? {}) as RequestBody;
  if (!body.passport || !body.destination || !body.purpose) {
    return res.status(400).json({ error: "passport, destination and purpose are required" });
  }

  const passportCode = body.passport.length === 2 ? body.passport.toUpperCase() : body.passport;
  const destinationCode = body.destination.length === 2 ? body.destination.toUpperCase() : body.destination;
  const sources = VISA_SOURCES[destinationCode] ?? [];

  if (!sources.length) {
    return res.status(200).json({
      sourceCheckedAt: new Date().toISOString(),
      sourceEvidence: [],
      jev: { category: "needs_review", needsReview: true },
    });
  }

  const evidence: { title: string; url: string; excerpt?: string }[] = [];

  for (const source of sources.slice(0, 3)) {
    try {
      const sourceResponse = await fetch(source.url, {
        headers: {
          "User-Agent": "VisaCraft/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (!sourceResponse.ok) continue;
      const html = await sourceResponse.text();
      evidence.push({
        title: source.title,
        url: source.url,
        excerpt: truncate(stripHtml(html)).slice(0, 5000),
      });
    } catch {
      // Continue with other official sources.
    }
  }

  const state = {
    traveler: { passport: passportCode, destination: destinationCode, purpose: body.purpose },
    discoveryCategory: body.accessCategory ?? "unknown",
    officialSources: evidence,
  };

  const jevRaw = await callJev(state);
  const jev = jevRaw
    ? extractJev(jevRaw)
    : { category: "needs_review", needsReview: true };

  return res.status(200).json({
    sourceCheckedAt: new Date().toISOString(),
    sourceEvidence: evidence,
    jev,
  });
}
