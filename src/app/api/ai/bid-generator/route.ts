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

    if (apiKey) {
      const systemPrompt = `You are a professional construction and property preservation estimator.
Parse the user's natural language request and break it down into a list of structured bid items.
Output ONLY a valid JSON ARRAY matching this schema exactly:
[
  {
    "title": "Short descriptive title of the work",
    "description": "Detailed description of what will be done",
    "unit": "The unit of measurement (e.g., SQFT, EACH, CYD, LF, HR, SQ)",
    "quantity": number,
    "price": number (the price per unit),
    "amount": number (quantity * price)
  }
]
Example: "replace 900sqft asphalt roof"
[
  {"title": "Tear-off existing roof", "description": "Remove and dispose of existing damaged asphalt shingles", "unit": "SQ", "quantity": 9, "price": 85.00, "amount": 765},
  {"title": "Install asphalt shingles", "description": "Install new architectural asphalt shingles including underlayment and drip edge", "unit": "SQ", "quantity": 9, "price": 320.00, "amount": 2880}
]
Make reasonable market-rate estimations for price if not specified. Always break complex jobs into 2 to 5 logical line items with descriptions.
Return ONLY the raw JSON array, no markdown blocks, no backticks.`;

      // Try gemini-2.5-flash or gemini-1.5-flash
      const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
      for (const model of models) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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

          if (response.ok) {
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
            if (cleanText) {
              const parsed = JSON.parse(cleanText);
              if (Array.isArray(parsed) && parsed.length > 0) {
                return NextResponse.json(parsed);
              }
            }
          }
        } catch (err) {
          console.warn(`Gemini model ${model} error:`, err);
        }
      }
    }

    // Heuristic Fallback Generator (if API Key missing or AI request fails)
    const generatedItems = generateFallbackBids(prompt);
    return NextResponse.json(generatedItems);
  } catch (error: any) {
    console.error("AI bid generation error:", error);
    // Fallback response instead of error
    const fallback = generateFallbackBids("general property preservation repair");
    return NextResponse.json(fallback);
  }
}

function generateFallbackBids(prompt: string) {
  const p = prompt.toLowerCase();

  // Roofing
  if (p.includes("roof") || p.includes("shingle") || p.includes("leak") || p.includes("tarp")) {
    return [
      {
        title: "Tear-Off & Disposal of Damaged Roofing",
        description: "Remove damaged shingles, underlayment, and clean roof deck surface",
        unit: "SQFT",
        quantity: 500,
        price: 1.75,
        amount: 875,
      },
      {
        title: "Install Architectural Shingles & Underlayment",
        description: "Supply and install 30-year architectural shingles, synthetic underlayment, and drip edge",
        unit: "SQFT",
        quantity: 500,
        price: 4.25,
        amount: 2125,
      },
      {
        title: "Flashing & Ridge Cap Sealing",
        description: "Install galvanized flashing around chimney/vents and seal ridge caps",
        unit: "LF",
        quantity: 60,
        price: 8.50,
        amount: 510,
      }
    ];
  }

  // Lawn / Tree / Yard
  if (p.includes("tree") || p.includes("lawn") || p.includes("grass") || p.includes("debris") || p.includes("yard")) {
    return [
      {
        title: "Initial Overgrown Yard Clean-Cut & Edging",
        description: "Cut overgrown grass up to 12 inches, trim perimeter edges, and blow clear walkways",
        unit: "SQFT",
        quantity: 2500,
        price: 0.15,
        amount: 375,
      },
      {
        title: "Tree Branch Trimming & Brush Clearing",
        description: "Trim low-hanging branches touching structure and clear dense brush from fence line",
        unit: "HOURS",
        quantity: 4,
        price: 65.00,
        amount: 260,
      },
      {
        title: "Yard Debris Loading & Haul-Off",
        description: "Load organic debris and branches into trailer and haul to authorized green waste facility",
        unit: "CYD",
        quantity: 10,
        price: 45.00,
        amount: 450,
      }
    ];
  }

  // Winterization / Plumbing
  if (p.includes("winter") || p.includes("plumb") || p.includes("pipe") || p.includes("freeze")) {
    return [
      {
        title: "Complete System Winterization & Pressure Test",
        description: "Drain all water lines, blow out supply pipes with compressed air, and test pressure hold",
        unit: "JOB",
        quantity: 1,
        price: 350.00,
        amount: 350,
      },
      {
        title: "Non-Toxic Antifreeze Treatment",
        description: "Add non-toxic RV antifreeze to all traps, sinks, toilets, and appliance drainage points",
        unit: "EACH",
        quantity: 5,
        price: 35.00,
        amount: 175,
      },
      {
        title: "Main Water Valve Lockout & Posting",
        description: "Secure main water shut-off valve with zip lock and attach official winterization tag",
        unit: "EACH",
        quantity: 1,
        price: 75.00,
        amount: 75,
      }
    ];
  }

  // Trashout / Cleanout
  if (p.includes("trash") || p.includes("clean") || p.includes("junk") || p.includes("dump")) {
    return [
      {
        title: "Interior Debris & Personal Property Removal",
        description: "Bag, haul out, and dispose of remaining interior debris and hazardous materials",
        unit: "CYD",
        quantity: 15,
        price: 48.00,
        amount: 720,
      },
      {
        title: "Broom-Swept Interior Maid Service",
        description: "Broom sweep all hard floors, vacuum carpets, wipe down countertops, and sanitize sinks",
        unit: "SQFT",
        quantity: 1800,
        price: 0.20,
        amount: 360,
      }
    ];
  }

  // Default multi-item preservation bid generator
  return [
    {
      title: `Property Inspection & Scope Evaluation — ${prompt.slice(0, 30)}`,
      description: `Perform initial walkthrough and safety audit for: ${prompt}`,
      unit: "JOB",
      quantity: 1,
      price: 150.00,
      amount: 150,
    },
    {
      title: "Preservation Repair & Remediation Labor",
      description: `Execute required repairs, secure structure, and correct safety violations per specs: ${prompt}`,
      unit: "HOURS",
      quantity: 8,
      price: 75.00,
      amount: 600,
    },
    {
      title: "Materials, Hauling & Site Cleanup",
      description: "Supply required lumber, fasteners, hardware, and haul off generated job site waste",
      unit: "JOB",
      quantity: 1,
      price: 275.00,
      amount: 275,
    }
  ];
}
