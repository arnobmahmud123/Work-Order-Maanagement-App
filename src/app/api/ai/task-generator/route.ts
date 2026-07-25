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
      const systemPrompt = `You are a professional property preservation and maintenance task specialist.
Parse the user's natural language request and break it down into a highly comprehensive, granular list of structured task items (up to 50 items max).
Do NOT write generic summaries. You must cover every step of the job in detail using industry-standard property preservation terminology and language.

CRITICAL REQUIREMENT: Every single line item's "description" field MUST explicitly include the calculated dimension/quantity and unit of measurement for that specific item (for example: "Remove existing asphalt shingles down to deck for 1,200 SF area", "Install galvanized drip edge over a length of 180 LF", "Load and haul off 15 CYD of organic yard waste debris", etc.). Never write descriptions without stating the exact dimension and unit.

Output ONLY a valid JSON ARRAY matching this schema exactly:
[
  {
    "title": "Short descriptive title of the task",
    "description": "Detailed description of what will be done in professional, industry-standard terms, explicitly mentioning the quantity and unit (e.g. 1000 SF, 180 LF, 12 CYD)",
    "unit": "The unit of measurement (e.g., SF, EACH, CYD, LF, LS, HR)",
    "quantity": number,
    "price": number (the price per unit),
    "amount": number (quantity * price)
  }
]

Make reasonable market-rate estimations for price if not specified.
Return ONLY the raw JSON array, no markdown blocks, no backticks.`;

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

    const generatedItems = generateFallbackTasks(prompt);
    return NextResponse.json(generatedItems);
  } catch (error: any) {
    console.error("AI task generation error:", error);
    const fallback = generateFallbackTasks("general property preservation repair");
    return NextResponse.json(fallback);
  }
}

function generateFallbackTasks(prompt: string) {
  const p = prompt.toLowerCase();

  // Helper to parse quantity size from prompt
  let qty = 1000;
  const matchNum = prompt.match(/(\d+[\d,]*)\s*(sqft|sf|sq\s*ft|sq|lf|cyd|yards|ft)/i);
  if (matchNum) {
    qty = parseInt(matchNum[1].replace(/,/g, ""));
  } else {
    const fallbackMatch = prompt.match(/(\d+[\d,]*)/);
    if (fallbackMatch) {
      qty = parseInt(fallbackMatch[1].replace(/,/g, ""));
    }
  }

  // 1. Roofing Removal & Replacement
  if (p.includes("roof") || p.includes("shingle") || p.includes("leak") || p.includes("tarp")) {
    const lfMultiplier = Math.round(qty * 0.18);
    const ridgeMultiplier = Math.round(qty * 0.045);
    const iceShieldMultiplier = Math.round(qty * 0.22);
    
    return [
      {
        title: "Remove existing asphalt shingles",
        description: `Carefully remove and strip existing asphalt shingles down to the bare wooden decking for a total of ${qty} SF.`,
        unit: "SF",
        quantity: qty,
        price: 1.50,
        amount: qty * 1.50
      },
      {
        title: "Remove existing synthetic/felt underlayment",
        description: `Remove and dispose of existing deteriorated felt paper or synthetic underlayment across ${qty} SF of surface area.`,
        unit: "SF",
        quantity: qty,
        price: 0.40,
        amount: qty * 0.40
      },
      {
        title: "Remove existing roofing nails and fasteners",
        description: `Extract remaining nails, staples, and metallic fasteners from deck surface to prepare for re-roofing (1 LS).`,
        unit: "LS",
        quantity: 1,
        price: 150.00,
        amount: 150.00
      },
      {
        title: "Remove and dispose of damaged drip edge",
        description: `Remove old corroded aluminum or galvanized steel drip edge from the eaves and rakes over a length of ${lfMultiplier || 180} LF.`,
        unit: "LF",
        quantity: lfMultiplier || 180,
        price: 1.20,
        amount: (lfMultiplier || 180) * 1.20
      },
      {
        title: "Remove and dispose of ridge cap shingles",
        description: `Tear off existing cap shingles along the ridge lines and hips over a length of ${ridgeMultiplier || 45} LF.`,
        unit: "LF",
        quantity: ridgeMultiplier || 45,
        price: 1.50,
        amount: (ridgeMultiplier || 45) * 1.50
      },
      {
        title: "Remove and dispose of pipe boot flashings",
        description: `Extract deteriorated rubber/neoprene pipe boot flashings from plumbing vent penetrations (3 EA).`,
        unit: "EA",
        quantity: 3,
        price: 35.00,
        amount: 105.00
      },
      {
        title: "Remove and dispose of roof vent flashings",
        description: `Tear out old passive roof ventilation units (box vents/slant-back vents) and clear perimeter (4 EA).`,
        unit: "EA",
        quantity: 4,
        price: 45.00,
        amount: 180.00
      },
      {
        title: "Remove and dispose of chimney flashing (if present)",
        description: `Carefully detach old lead or copper step and counter-flashing from the chimney structure over a length of 25 LF.`,
        unit: "LF",
        quantity: 25,
        price: 5.50,
        amount: 137.50
      },
      {
        title: "Remove all roofing debris from roof surface and surrounding grounds",
        description: `Clean gutters, rakes, valley lines, and ground perimeter of all loose shingles, paper, and grit (1 LS).`,
        unit: "LS",
        quantity: 1,
        price: 250.00,
        amount: 250.00
      },
      {
        title: "Furnish and install ice & water shield at eaves and valleys",
        description: `Apply self-adhering polymer-modified asphalt ice and water barrier membrane along eaves and valleys for ${iceShieldMultiplier || 220} SF.`,
        unit: "SF",
        quantity: iceShieldMultiplier || 220,
        price: 2.50,
        amount: (iceShieldMultiplier || 220) * 2.50
      },
      {
        title: "Furnish and install synthetic roof underlayment",
        description: `Install high-tensile strength non-woven synthetic roof underlayment over the ${qty} SF roof decking.`,
        unit: "SF",
        quantity: qty,
        price: 0.90,
        amount: qty * 0.90
      },
      {
        title: "Furnish and install architectural asphalt shingles",
        description: `Supply and install premium 30-year lifetime architectural laminated asphalt shingles over ${qty} SF roof area.`,
        unit: "SF",
        quantity: qty,
        price: 3.75,
        amount: qty * 3.75
      },
      {
        title: "Furnish and install starter strip shingles",
        description: `Install pre-cut shingle starter strip along all eaves and rakes over a length of ${lfMultiplier || 180} LF.`,
        unit: "LF",
        quantity: lfMultiplier || 180,
        price: 2.20,
        amount: (lfMultiplier || 180) * 2.20
      },
      {
        title: "Furnish and install ridge cap shingles",
        description: `Install matching high-profile ridge cap shingles along hips and ridges over a length of ${ridgeMultiplier || 45} LF.`,
        unit: "LF",
        quantity: ridgeMultiplier || 45,
        price: 3.50,
        amount: (ridgeMultiplier || 45) * 3.50
      },
      {
        title: "Furnish and install aluminum drip edge",
        description: `Install new pre-bent 2x2 white or brown aluminum drip edge along eaves and rakes over ${lfMultiplier || 180} LF.`,
        unit: "LF",
        quantity: lfMultiplier || 180,
        price: 2.80,
        amount: (lfMultiplier || 180) * 2.80
      },
      {
        title: "Furnish and install pipe boot flashings",
        description: `Install new leak-proof rubber/silicone boot flashings over all stack protrusions (3 EA).`,
        unit: "EA",
        quantity: 3,
        price: 75.00,
        amount: 225.00
      },
      {
        title: "Furnish and install roof vent flashings",
        description: `Supply and install high-airflow passive box vents with integrated rodent screens (4 EA).`,
        unit: "EA",
        quantity: 4,
        price: 95.00,
        amount: 380.00
      },
      {
        title: "Furnish and install step/counter flashing as required",
        description: `Install galvanized metal step flashing and counter-flashing over a length of 25 LF.`,
        unit: "LF",
        quantity: 25,
        price: 12.50,
        amount: 312.50
      },
      {
        title: "Install new galvanized roofing nails and fasteners",
        description: `Secure all shingles and underlayment using double-hot-dipped galvanized nails (1 LS).`,
        unit: "LS",
        quantity: 1,
        price: 120.00,
        amount: 120.00
      },
      {
        title: "Seal all flashing penetrations with roofing sealant",
        description: `Apply industrial grade elastomeric black flashing cement to all exposed fasteners and boot margins (1 LS).`,
        unit: "LS",
        quantity: 1,
        price: 110.00,
        amount: 110.00
      },
      {
        title: "Final roof inspection and cleanup",
        description: `Complete final quality control check of shingles alignment, flashing seals, and decking rigidity (1 LS).`,
        unit: "LS",
        quantity: 1,
        price: 200.00,
        amount: 200.00
      },
      {
        title: "Magnet sweep to remove roofing nails from lawn and driveway",
        description: `Run heavy-duty rolling magnetic sweeps across the entire lawn perimeter and driveway (1 LS).`,
        unit: "LS",
        quantity: 1,
        price: 95.00,
        amount: 95.00
      },
      {
        title: "Haul away and legally dispose of all roofing debris",
        description: `Load all stripped shingles, paper, metal scrap, and trash into dump container and haul away (1 LS).`,
        unit: "LS",
        quantity: 1,
        price: 380.00,
        amount: 380.00
      }
    ];
  }

  // 2. Vinyl Siding Removal & Replacement
  if (p.includes("siding") || p.includes("vinyl") || p.includes("soffit") || p.includes("fascia")) {
    const debrisCyd = Math.max(1, Math.round(qty * 0.01));
    const lfMultiplier = Math.round(qty * 0.2);

    return [
      {
        title: "Remove existing vinyl siding",
        description: `Carefully strip and remove deteriorated or damaged vinyl siding panels and utility trim for ${qty} SF of wall surface.`,
        unit: "SF",
        quantity: qty,
        price: 1.25,
        amount: qty * 1.25
      },
      {
        title: "Furnish and install new vinyl siding",
        description: `Supply and install premium double-four profile vinyl siding, including house wrap and insulation backing, over ${qty} SF of wall area.`,
        unit: "SF",
        quantity: qty,
        price: 4.50,
        amount: qty * 4.50
      },
      {
        title: "Haul away generated vinyl siding debris",
        description: `Load all old vinyl, packaging, and scrap siding into vehicle and haul away covering ${debrisCyd} CYD of debris.`,
        unit: "CYD",
        quantity: debrisCyd,
        price: 65.00,
        amount: debrisCyd * 65.00
      },
      {
        title: "Furnish and install vinyl starter strips",
        description: `Secure new vinyl locking starter tracks along the base perimeter of all walls over a length of ${lfMultiplier || 80} LF.`,
        unit: "LF",
        quantity: lfMultiplier || 80,
        price: 2.50,
        amount: (lfMultiplier || 80) * 2.50
      },
      {
        title: "Furnish and install vinyl outside corner posts",
        description: `Install 3-1/4 inch vinyl outside corner posts to ensure clean waterproof vertical seams (4 EA).`,
        unit: "EACH",
        quantity: 4,
        price: 45.00,
        amount: 180.00
      },
      {
        title: "Trim around windows, doors, and penetrations",
        description: `Install vinyl J-channel molding around all window frames, door frames, and dryer vents (1 LS).`,
        unit: "LS",
        quantity: 1,
        price: 250.00,
        amount: 250.00
      }
    ];
  }

  // 3. Lawn / Tree / Yard Maintenance
  if (p.includes("tree") || p.includes("lawn") || p.includes("grass") || p.includes("debris") || p.includes("yard")) {
    const debrisQty = Math.max(2, Math.round(qty * 0.004));
    return [
      {
        title: "Initial Overgrown Yard Clean-Cut & Edging",
        description: `Cut overgrown grass up to 12 inches, trim perimeter edges, and blow clear walkways for ${qty || 2500} SF of yard area.`,
        unit: "SF",
        quantity: qty || 2500,
        price: 0.15,
        amount: (qty || 2500) * 0.15,
      },
      {
        title: "Tree Branch Trimming & Brush Clearing",
        description: `Trim low-hanging branches touching structure and clear dense brush from fence line (6 HR).`,
        unit: "HOURS",
        quantity: 6,
        price: 65.00,
        amount: 390.00,
      },
      {
        title: "Yard Debris Loading & Haul-Off",
        description: `Load organic debris and branches into trailer and haul away covering ${debrisQty || 10} CYD of yard debris.`,
        unit: "CYD",
        quantity: debrisQty || 10,
        price: 45.00,
        amount: (debrisQty || 10) * 45.00,
      },
      {
        title: "Apply Weed Killer and Herbicide Treatment",
        description: `Treat driveway, expansion joints, and planter beds with non-selective herbicide over ${qty || 2500} SF area.`,
        unit: "SQFT",
        quantity: qty || 2500,
        price: 0.05,
        amount: (qty || 2500) * 0.05
      }
    ];
  }

  // 4. Winterization / Plumbing
  if (p.includes("winter") || p.includes("plumb") || p.includes("pipe") || p.includes("freeze")) {
    return [
      {
        title: "Complete System Winterization & Pressure Test",
        description: `Drain all water lines, blow out supply pipes with compressed air, and test pressure hold (1 JOB).`,
        unit: "JOB",
        quantity: 1,
        price: 350.00,
        amount: 350,
      },
      {
        title: "Non-Toxic Antifreeze Treatment",
        description: `Add non-toxic RV antifreeze to all traps, sinks, toilets, and appliance drainage points (5 EA).`,
        unit: "EACH",
        quantity: 5,
        price: 35.00,
        amount: 175,
      },
      {
        title: "Main Water Valve Lockout & Posting",
        description: `Secure main water shut-off valve with zip lock and attach official winterization tag (1 EA).`,
        unit: "EACH",
        quantity: 1,
        price: 75.00,
        amount: 75,
      },
      {
        title: "Water Heater Tank Drainage",
        description: `Hook up hose to bottom spigot of water heater, open pressure release valve, and drain tank completely (1 EA).`,
        unit: "EACH",
        quantity: 1,
        price: 95.00,
        amount: 95.00
      }
    ];
  }

  // 5. Trashout / Cleanout
  if (p.includes("trash") || p.includes("clean") || p.includes("junk") || p.includes("dump")) {
    const debrisVol = Math.max(5, Math.round(qty * 0.008));
    return [
      {
        title: "Interior Debris & Personal Property Removal",
        description: `Bag, haul out, and dispose of remaining interior debris and hazardous materials covering ${debrisVol || 15} CYD of volume.`,
        unit: "CYD",
        quantity: debrisVol || 15,
        price: 48.00,
        amount: (debrisVol || 15) * 48.00,
      },
      {
        title: "Broom-Swept Interior Maid Service",
        description: `Broom sweep all hard floors, vacuum carpets, wipe down countertops, and sanitize sinks for ${qty || 1800} SF.`,
        unit: "SQFT",
        quantity: qty || 1800,
        price: 0.20,
        amount: (qty || 1800) * 0.20,
      },
      {
        title: "Exterior Yard Trash and General Debris Haul",
        description: `Gather, load, and transport exterior junk, loose tires, and loose metal sheets covering 5 CYD.`,
        unit: "CYD",
        quantity: 5,
        price: 45.00,
        amount: 225.00
      }
    ];
  }

  // Default multi-item preservation task generator
  return [
    {
      title: "Property Inspection & Scope Evaluation",
      description: `Perform initial walkthrough and safety audit for: ${prompt} (1 JOB).`,
      unit: "JOB",
      quantity: 1,
      price: 150.00,
      amount: 150,
    },
    {
      title: "Preservation Repair & Remediation Labor",
      description: `Execute required repairs, secure structure, and correct safety violations for: ${prompt} (8 HR).`,
      unit: "HOURS",
      quantity: 8,
      price: 75.00,
      amount: 600,
    },
    {
      title: "Materials, Hauling & Site Cleanup",
      description: `Supply required lumber, fasteners, hardware, and haul off generated job site waste (1 JOB).`,
      unit: "JOB",
      quantity: 1,
      price: 275.00,
      amount: 275,
    }
  ];
}
