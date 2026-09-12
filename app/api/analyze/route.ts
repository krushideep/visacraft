import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { AUSTRALIA_VISITOR } from "@/lib/rules";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const applicant = body.applicant ?? {};
    const documents = body.documents ?? [];
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";
    const prompt = `You are VisaCraft's document-review assistant.\nDo NOT decide visa eligibility or predict approval. Do NOT invent immigration rules.\nThe deterministic requirements are supplied below. Analyze only the applicant profile and uploaded-document metadata/text.\nReturn strict JSON with: score (0-100), summary, issues [{severity:"high"|"medium"|"low",title,detail}], documents [{name,status:"matched"|"review"|"unmatched",reason}].\nRequirements: ${JSON.stringify(AUSTRALIA_VISITOR)}\nApplicant: ${JSON.stringify(applicant)}\nDocuments: ${JSON.stringify(documents)}`;
    const response = await client.responses.create({ model, input: prompt, text: { format: { type: "json_object" } } });
    return NextResponse.json(JSON.parse(response.output_text));
  } catch (error) {
    return NextResponse.json({ error: "AI analysis failed. Check OPENAI_API_KEY and try again." }, { status: 500 });
  }
}