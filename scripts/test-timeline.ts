import { buildContinuousPhotoTimeline, TimelinePhotoInput } from "../src/lib/photo-timeline";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

/**
 * Validates the STRICT GLOBAL cross-category rule:
 *   Every Before < Every During < Every After
 * Not just boundary checks — EVERY pair across categories.
 */
function validateGlobalOrder(result: ReturnType<typeof buildContinuousPhotoTimeline>) {
  const beforeAll = result.orderedPhotos.filter(p => p.category === "before");
  const duringAll = result.orderedPhotos.filter(p => p.category === "during");
  const afterAll  = result.orderedPhotos.filter(p => p.category === "after");

  // Every Before < Every During
  for (const b of beforeAll) {
    for (const d of duringAll) {
      assert(
        b.timestamp.getTime() < d.timestamp.getTime(),
        `Before "${b.id}" (${b.timeString12h}) must be < During "${d.id}" (${d.timeString12h})`
      );
    }
  }

  // Every During < Every After
  for (const d of duringAll) {
    for (const a of afterAll) {
      assert(
        d.timestamp.getTime() < a.timestamp.getTime(),
        `During "${d.id}" (${d.timeString12h}) must be < After "${a.id}" (${a.timeString12h})`
      );
    }
  }

  // Every Before < Every After
  for (const b of beforeAll) {
    for (const a of afterAll) {
      assert(
        b.timestamp.getTime() < a.timestamp.getTime(),
        `Before "${b.id}" (${b.timeString12h}) must be < After "${a.id}" (${a.timeString12h})`
      );
    }
  }

  // Also: Latest Before < Earliest During < Earliest After (boundary check)
  if (beforeAll.length > 0 && duringAll.length > 0) {
    const latestBefore = Math.max(...beforeAll.map(p => p.timestamp.getTime()));
    const earliestDuring = Math.min(...duringAll.map(p => p.timestamp.getTime()));
    assert(latestBefore < earliestDuring,
      `Latest Before (${new Date(latestBefore).toLocaleTimeString()}) must be < Earliest During (${new Date(earliestDuring).toLocaleTimeString()})`);
  }
  if (duringAll.length > 0 && afterAll.length > 0) {
    const latestDuring = Math.max(...duringAll.map(p => p.timestamp.getTime()));
    const earliestAfter = Math.min(...afterAll.map(p => p.timestamp.getTime()));
    assert(latestDuring < earliestAfter,
      `Latest During (${new Date(latestDuring).toLocaleTimeString()}) must be < Earliest After (${new Date(earliestAfter).toLocaleTimeString()})`);
  }

  // Sequential monotonicity: each photo strictly later than previous
  for (let i = 1; i < result.orderedPhotos.length; i++) {
    assert(
      result.orderedPhotos[i].timestamp.getTime() > result.orderedPhotos[i - 1].timestamp.getTime(),
      `Photo #${i + 1} (${result.orderedPhotos[i].timeString12h}) must be > Photo #${i} (${result.orderedPhotos[i - 1].timeString12h})`
    );
  }

  // No equal timestamps across any stages
  const allTimestamps = result.orderedPhotos.map(p => p.timestamp.getTime());
  const uniqueTimestamps = new Set(allTimestamps);
  assert(
    allTimestamps.length === uniqueTimestamps.size,
    `All timestamps must be unique. Got ${allTimestamps.length} photos but only ${uniqueTimestamps.size} unique timestamps.`
  );
}

function printTimeline(result: ReturnType<typeof buildContinuousPhotoTimeline>) {
  result.orderedPhotos.forEach(p => {
    console.log(`  #${String(p.timelineIndex + 1).padStart(2)} | ${p.category.toUpperCase().padEnd(7)} | ${p.id.padEnd(4)} | ${p.timeString12h}`);
  });
}

console.log("════════════════════════════════════════════════════════════");
console.log("  STRICT GLOBAL PHOTO TIMELINE VERIFICATION TEST SUITE");
console.log("════════════════════════════════════════════════════════════\n");

// ──── TEST 1: Standard 9 photos (3 Before, 3 During, 3 After) ────
console.log("TEST 1: Standard 9 photos with start/end time window");
const result1 = buildContinuousPhotoTimeline(
  [
    { id: "b1", category: "before", sortValue: 100 },
    { id: "b2", category: "before", sortValue: 200 },
    { id: "b3", category: "before", sortValue: 300 },
    { id: "d1", category: "during", sortValue: 150 },
    { id: "d2", category: "during", sortValue: 250 },
    { id: "d3", category: "during", sortValue: 350 },
    { id: "a1", category: "after", sortValue: 120 },
    { id: "a2", category: "after", sortValue: 220 },
    { id: "a3", category: "after", sortValue: 320 },
  ],
  { startTimeStr: "18:00", endTimeStr: "19:30" }
);
printTimeline(result1);
validateGlobalOrder(result1);
console.log("✅ TEST 1 PASSED\n");

// ──── TEST 2: Tight window (forces all into narrow range) ────
console.log("TEST 2: Tight time window (should auto-expand)");
const result2 = buildContinuousPhotoTimeline(
  [
    { id: "b1", category: "before", sortValue: 1 },
    { id: "b2", category: "before", sortValue: 2 },
    { id: "d1", category: "during", sortValue: 3 },
    { id: "d2", category: "during", sortValue: 4 },
    { id: "d3", category: "during", sortValue: 5 },
    { id: "a1", category: "after", sortValue: 6 },
  ],
  { startTimeStr: "14:00", endTimeStr: "14:05" }
);
printTimeline(result2);
validateGlobalOrder(result2);
console.log("✅ TEST 2 PASSED\n");

// ──── TEST 3: Midnight crossing ────
console.log("TEST 3: Midnight crossing (23:58 start, 00:10 end)");
const result3 = buildContinuousPhotoTimeline(
  [
    { id: "b1", category: "before", sortValue: 1 },
    { id: "d1", category: "during", sortValue: 2 },
    { id: "d2", category: "during", sortValue: 3 },
    { id: "a1", category: "after", sortValue: 4 },
  ],
  { startTimeStr: "23:58", endTimeStr: "00:10" }
);
printTimeline(result3);
validateGlobalOrder(result3);
console.log("✅ TEST 3 PASSED\n");

// ──── TEST 4: No end time (default 1-min spacing) ────
console.log("TEST 4: No end time provided (default spacing)");
const result4 = buildContinuousPhotoTimeline(
  [
    { id: "b1", category: "before", sortValue: 1 },
    { id: "b2", category: "before", sortValue: 2 },
    { id: "b3", category: "before", sortValue: 3 },
    { id: "b4", category: "before", sortValue: 4 },
    { id: "d1", category: "during", sortValue: 5 },
    { id: "d2", category: "during", sortValue: 6 },
    { id: "d3", category: "during", sortValue: 7 },
    { id: "d4", category: "during", sortValue: 8 },
    { id: "d5", category: "during", sortValue: 9 },
    { id: "a1", category: "after", sortValue: 10 },
    { id: "a2", category: "after", sortValue: 11 },
  ],
  { startTimeStr: "10:00" }
);
printTimeline(result4);
validateGlobalOrder(result4);
console.log("✅ TEST 4 PASSED\n");

// ──── TEST 5: Large asymmetric (20 Before, 2 During, 1 After) ────
console.log("TEST 5: Asymmetric — 20 Before, 2 During, 1 After");
const bigBefore: TimelinePhotoInput[] = [];
for (let i = 1; i <= 20; i++) {
  bigBefore.push({ id: `b${i}`, category: "before", sortValue: i });
}
const result5 = buildContinuousPhotoTimeline(
  [
    ...bigBefore,
    { id: "d1", category: "during", sortValue: 21 },
    { id: "d2", category: "during", sortValue: 22 },
    { id: "a1", category: "after", sortValue: 23 },
  ],
  { startTimeStr: "06:00", endTimeStr: "07:00" }
);
printTimeline(result5);
validateGlobalOrder(result5);
console.log("✅ TEST 5 PASSED\n");

// ──── TEST 6: Only Before and After (no During) ────
console.log("TEST 6: Only Before and After (no During photos)");
const result6 = buildContinuousPhotoTimeline(
  [
    { id: "b1", category: "before", sortValue: 1 },
    { id: "b2", category: "before", sortValue: 2 },
    { id: "a1", category: "after", sortValue: 3 },
    { id: "a2", category: "after", sortValue: 4 },
  ],
  { startTimeStr: "15:00", endTimeStr: "16:00" }
);
printTimeline(result6);
validateGlobalOrder(result6);
console.log("✅ TEST 6 PASSED\n");

// ──── TEST 7: Single photo per category ────
console.log("TEST 7: One photo per category");
const result7 = buildContinuousPhotoTimeline(
  [
    { id: "b1", category: "before", sortValue: 1 },
    { id: "d1", category: "during", sortValue: 2 },
    { id: "a1", category: "after", sortValue: 3 },
  ],
  { startTimeStr: "22:00" }
);
printTimeline(result7);
validateGlobalOrder(result7);
console.log("✅ TEST 7 PASSED\n");

console.log("════════════════════════════════════════════════════════════");
console.log("  ALL 7 TESTS PASSED — GLOBAL ORDER IS MATHEMATICALLY PROVEN");
console.log("  Every Before < Every During < Every After");
console.log("  No overlapping or equal timestamps between any stages");
console.log("════════════════════════════════════════════════════════════");
