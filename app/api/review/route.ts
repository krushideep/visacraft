import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { text, documents } = await req.json();
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input: `Review these visa-application materials for internal consistency only. Never claim approval odds and never invent requirements. Identify contradictions in names, dates, amounts, employment, travel dates, and stated purpose. Return JSON: {issues:[{severity,title,detail}],summary}. Materials: ${JSON.stringify({text,documents})}`,
      text: { format: { type: "json_object" } }
    });
    return NextResponse.json(JSON.parse(response.output_text));
  } catch {
    return NextResponse.json({ error: "AI review failed." }, { status: 500 });
  }
}