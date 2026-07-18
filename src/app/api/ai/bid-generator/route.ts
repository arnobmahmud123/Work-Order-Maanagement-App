import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const systemPrompt = `You are a professional construction and property preservation estimator.
Parse the user's natural language request and break it down into a list of structured bid items.
Output ONLY a valid JSON ARRAY matching this schema exactly:
[
  {
    "title": "Short descriptive title of the work",
    "description": "Detailed description of what will be done",
    "unit": "The unit of measurement (e.g., SQFT, EACH, CYD, LF, HR)",
    "quantity": number,
    "price": number (the price per unit),
    "amount": number (quantity * price)
  }
]
Example 1: "replace 900sqft asphalt roof"
[
  {"title": "Tear-off existing roof", "description": "Remove and dispose of existing asphalt shingles", "unit": "SQ", "quantity": 9, "price": 85.00, "amount": 765},
  {"title": "Install asphalt shingles", "description": "Install new architectural asphalt shingles including underlayment", "unit": "SQ", "quantity": 9, "price": 320.00, "amount": 2880}
]
Make reasonable market-rate estimations for price if not specified. Break complex jobs into logical line items.
Return ONLY the raw JSON array, no markdown blocks, no backticks.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt + "\n\nUser request: " + prompt }]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API Error:", errText);
      return NextResponse.json({ error: "Failed to generate bid via AI" }, { status: 500 });
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
      const parsed = JSON.parse(cleanText);
      return NextResponse.json(parsed);
    } catch (e) {
      console.error("Failed to parse JSON from AI:", text);
      return NextResponse.json({ error: "AI returned invalid response format" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("AI bid generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate bid" }, { status: 500 });
  }
}
