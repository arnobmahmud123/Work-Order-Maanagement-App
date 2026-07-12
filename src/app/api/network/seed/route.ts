import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (secret !== "seed123") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get users to be authors
    const users = await prisma.user.findMany({ take: 5 });
    if (users.length === 0) {
      return NextResponse.json({ error: "No users found in DB to attach posts to." }, { status: 400 });
    }

    const getRandomUser = () => users[Math.floor(Math.random() * users.length)].id;

    const demoPosts = [
      {
        title: "Need coverage in Dallas, TX this weekend",
        content: "I have 3 property preservation jobs that need to be completed by Sunday but my truck broke down. Anyone available to cover? Will split 70/30. Properties are mostly grass cuts and some light debris removal. Let me know ASAP!",
        category: "JOB_COVERAGE",
        city: "Dallas",
        state: "TX",
        zipCode: "75201",
        authorId: getRandomUser(),
        isUrgent: true,
        tags: ["Dallas", "Coverage", "Urgent", "Grass Cuts"]
      },
      {
        title: "Best tool for winterizing pipes?",
        content: "What air compressor is everyone using for winterizations this year? Looking to upgrade my setup before the busy season starts. Need something portable but powerful enough to clear 2-story houses efficiently.",
        category: "GENERAL",
        authorId: getRandomUser(),
        tags: ["Winterization", "Tools", "Advice"]
      },
      {
        title: "HUD updated their photo requirements for roof damage",
        content: "Just a heads up guys, HUD just released a new memo requiring at least 4 corner shots for any roof damage claims over $500. Make sure your crews are getting these photos or the work orders will get kicked back!",
        category: "ANNOUNCEMENT",
        authorId: getRandomUser(),
        tags: ["HUD", "Updates", "Photos", "Compliance"]
      },
      {
        title: "Looking for reliable sub in Miami area",
        content: "We are expanding our coverage to South Florida and need a reliable crew for grass cuts, lock changes, and debris removal. Volume is about 15-20 properties a week. Must have your own insurance and equipment.",
        category: "WORK_RELATED",
        city: "Miami",
        state: "FL",
        authorId: getRandomUser(),
        tags: ["Miami", "Subcontractor", "Hiring"]
      },
      {
        title: "How to deal with squatters refusing to leave?",
        content: "Arrived at a property today for an initial secure and found two people living inside. They claim they have a lease but couldn't produce it. Police said it's a civil matter. What's the best protocol here? I don't want to get in legal trouble for changing the locks.",
        category: "HELP_NEEDED",
        authorId: getRandomUser(),
        isUrgent: true,
        tags: ["Squatters", "Legal", "Initial Secure"]
      }
    ];

    let createdCount = 0;

    // Create the posts
    for (const post of demoPosts) {
      await prisma.post.create({
        data: post as any
      });
      createdCount++;
    }

    return NextResponse.json({ success: true, message: `Successfully seeded ${createdCount} network feed posts.` });

  } catch (err: any) {
    console.error("Failed to seed network posts:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
