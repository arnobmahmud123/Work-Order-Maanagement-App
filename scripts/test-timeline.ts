import { buildContinuousPhotoTimeline, TimelinePhotoInput } from "../src/lib/photo-timeline";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

console.log("Running Strict Chronological Photo Timeline Verification Tests...\n");

// Test 1: Standard Mixed Sequence
const testPhotos1: TimelinePhotoInput[] = [
  { id: "b1", category: "before", sortValue: 100 },
  { id: "b2", category: "before", sortValue: 200 },
  { id: "b3", category: "before", sortValue: 300 },
  { id: "d1", category: "during", sortValue: 150 },
  { id: "d2", category: "during", sortValue: 250 },
  { id: "d3", category: "during", sortValue: 350 },
  { id: "a1", category: "after", sortValue: 120 },
  { id: "a2", category: "after", sortValue: 220 },
  { id: "a3", category: "after", sortValue: 320 },
];

const result1 = buildContinuousPhotoTimeline(testPhotos1, {
  startTimeStr: "18:00", // 6:00 PM
  endTimeStr: "19:30",   // 7:30 PM
});

const beforeList1 = result1.orderedPhotos.filter(p => p.category === "before");
const duringList1 = result1.orderedPhotos.filter(p => p.category === "during");
const afterList1 = result1.orderedPhotos.filter(p => p.category === "after");

const maxBefore1 = Math.max(...beforeList1.map(p => p.timestamp.getTime()));
const minDuring1 = Math.min(...duringList1.map(p => p.timestamp.getTime()));
const maxDuring1 = Math.max(...duringList1.map(p => p.timestamp.getTime()));
const minAfter1 = Math.min(...afterList1.map(p => p.timestamp.getTime()));

console.log("Test 1 Timeline:");
result1.orderedPhotos.forEach(p => {
  console.log(`  #${p.timelineIndex + 1} | ${p.category.toUpperCase().padEnd(7)} | ${p.id} | ${p.timeString12h}`);
});

assert(maxBefore1 < minDuring1, "Max Before must be strictly earlier than Min During");
assert(maxDuring1 < minAfter1, "Max During must be strictly earlier than Min After");

for (let i = 1; i < result1.orderedPhotos.length; i++) {
  assert(
    result1.orderedPhotos[i].timestamp.getTime() > result1.orderedPhotos[i - 1].timestamp.getTime(),
    `Photo #${i + 1} must be strictly later than Photo #${i}`
  );
}
console.log("✓ Test 1 Passed: Before < During < After strictly satisfied!\n");

// Test 2: Midnight Crossing
const testPhotos2: TimelinePhotoInput[] = [
  { id: "b1", category: "before", sortValue: 1 },
  { id: "d1", category: "during", sortValue: 2 },
  { id: "a1", category: "after", sortValue: 3 },
];

const result2 = buildContinuousPhotoTimeline(testPhotos2, {
  startTimeStr: "23:58", // 11:58 PM
  endTimeStr: "00:05",   // 12:05 AM (next day)
});

console.log("Test 2 Midnight Crossing Timeline:");
result2.orderedPhotos.forEach(p => {
  console.log(`  #${p.timelineIndex + 1} | ${p.category.toUpperCase().padEnd(7)} | ${p.id} | ${p.timeString12h} (${p.timestamp.toISOString()})`);
});

const maxBefore2 = Math.max(...result2.orderedPhotos.filter(p => p.category === "before").map(p => p.timestamp.getTime()));
const minDuring2 = Math.min(...result2.orderedPhotos.filter(p => p.category === "during").map(p => p.timestamp.getTime()));
const maxDuring2 = Math.max(...result2.orderedPhotos.filter(p => p.category === "during").map(p => p.timestamp.getTime()));
const minAfter2 = Math.min(...result2.orderedPhotos.filter(p => p.category === "after").map(p => p.timestamp.getTime()));

assert(maxBefore2 < minDuring2, "Max Before must be strictly earlier than Min During across midnight");
assert(maxDuring2 < minAfter2, "Max During must be strictly earlier than Min After across midnight");
console.log("✓ Test 2 Passed: Midnight crossing handled seamlessly with strictly increasing Date!\n");

console.log("ALL MATHEMATICAL TIMELINE VERIFICATION TESTS PASSED SUCCESSFULLY!");
