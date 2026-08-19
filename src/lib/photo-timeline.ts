export type PhotoTimelineCategory = "before" | "during" | "after" | "none";

export interface TimelinePhotoInput {
  id: string;
  category: PhotoTimelineCategory;
  sortValue: number;
  originalName?: string;
}

export interface TimedPhotoOutput {
  id: string;
  category: PhotoTimelineCategory;
  timelineIndex: number;
  timestamp: Date;
  timeString12h: string;
}

export interface TimelineSectionSummary {
  start: Date;
  end: Date;
  count: number;
}

export interface ContinuousTimelineResult {
  orderedPhotos: TimedPhotoOutput[];
  photoMap: Map<string, TimedPhotoOutput>;
  sections: {
    before?: TimelineSectionSummary;
    during?: TimelineSectionSummary;
    after?: TimelineSectionSummary;
    none?: TimelineSectionSummary;
  };
}

export function format12h(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function parseTimeString(timeStr: string): { hour: number; minute: number } | null {
  if (!timeStr || !timeStr.includes(":")) return null;
  const parts = timeStr.split(":").map(Number);
  if (isNaN(parts[0]) || isNaN(parts[1])) return null;
  return { hour: parts[0], minute: parts[1] };
}

const ONE_MINUTE_MS = 60 * 1000;

/**
 * STRICT PHOTO TIMELINE GENERATOR
 *
 * Architecture:
 * 1. Sort ALL photos into one ordered list: Before → During → After → None
 * 2. Count photos per category to compute time budget per stage
 * 3. Assign timestamps stage-by-stage with guaranteed non-overlapping windows
 * 4. Run GLOBAL cross-category validation: every Before < every During < every After
 * 5. Auto-correct any violation, then re-validate
 *
 * The key difference from a naive sequential approach: timestamps are generated
 * in non-overlapping TIME WINDOWS per category, not just sequentially. This makes
 * it mathematically impossible for any Before to overlap any During, etc.
 */
export function buildContinuousPhotoTimeline(
  photos: TimelinePhotoInput[],
  options: {
    customDateStr?: string; // "YYYY-MM-DD"
    startTimeStr?: string;  // "HH:MM"
    endTimeStr?: string;    // "HH:MM"
    defaultDate?: Date;
  }
): ContinuousTimelineResult {
  const photoMap = new Map<string, TimedPhotoOutput>();
  const sections: ContinuousTimelineResult["sections"] = {};

  if (photos.length === 0) {
    return { orderedPhotos: [], photoMap, sections };
  }

  // ─── STEP 1: SORT ALL PHOTOS BY CATEGORY THEN SORT VALUE ───
  const categoryPriority: Record<PhotoTimelineCategory, number> = {
    before: 0,
    during: 1,
    after: 2,
    none: 3,
  };

  const sortedPhotos = [...photos].sort((a, b) => {
    const catDiff = categoryPriority[a.category] - categoryPriority[b.category];
    if (catDiff !== 0) return catDiff;
    if (a.sortValue !== b.sortValue) return a.sortValue - b.sortValue;
    return a.id.localeCompare(b.id);
  });

  // ─── STEP 2: PARSE BASE DATE ───
  const baseDateObj = options.defaultDate || new Date();
  let year = baseDateObj.getFullYear();
  let month = baseDateObj.getMonth() + 1;
  let day = baseDateObj.getDate();

  if (options.customDateStr && options.customDateStr.includes("-")) {
    const parts = options.customDateStr.split("-").map(Number);
    if (!isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }
  }

  // ─── STEP 3: PARSE START & END TIMES ───
  let startHour = 10;
  let startMinute = 0;

  if (options.startTimeStr) {
    const parsedStart = parseTimeString(options.startTimeStr);
    if (parsedStart) {
      startHour = parsedStart.hour;
      startMinute = parsedStart.minute;
    }
  } else if (options.defaultDate) {
    startHour = options.defaultDate.getHours();
    startMinute = options.defaultDate.getMinutes();
  }

  const timelineStart = new Date(year, month - 1, day, startHour, startMinute, 0, 0);

  const parsedEnd = parseTimeString(options.endTimeStr || "");
  let timelineEnd: Date | null = null;
  if (parsedEnd) {
    timelineEnd = new Date(year, month - 1, day, parsedEnd.hour, parsedEnd.minute, 0, 0);
    if (timelineEnd.getTime() <= timelineStart.getTime()) {
      timelineEnd = new Date(timelineEnd.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  // ─── STEP 4: COUNT PHOTOS PER CATEGORY ───
  const beforePhotos = sortedPhotos.filter(p => p.category === "before");
  const duringPhotos = sortedPhotos.filter(p => p.category === "during");
  const afterPhotos  = sortedPhotos.filter(p => p.category === "after");
  const nonePhotos   = sortedPhotos.filter(p => p.category === "none");

  const totalPhotos = sortedPhotos.length;

  // ─── STEP 5: COMPUTE NON-OVERLAPPING TIME WINDOWS PER STAGE ───
  // Each stage gets its own time window. Windows never overlap.
  // Between each stage boundary there is a mandatory 1-minute gap.

  const numCategories = [beforePhotos, duringPhotos, afterPhotos, nonePhotos].filter(a => a.length > 0).length;
  const gapsBetweenCategories = Math.max(0, numCategories - 1);

  // Minimum total time needed: 1 minute per photo + 1 minute gap between each category transition
  const minTotalMs = (totalPhotos - 1) * ONE_MINUTE_MS + gapsBetweenCategories * ONE_MINUTE_MS;

  // Determine effective end
  let effectiveEndMs: number;
  if (timelineEnd) {
    effectiveEndMs = Math.max(timelineEnd.getTime(), timelineStart.getTime() + minTotalMs);
  } else {
    effectiveEndMs = timelineStart.getTime() + minTotalMs;
  }

  const totalAvailableMs = effectiveEndMs - timelineStart.getTime();

  // Distribute time proportionally to each category by photo count
  // but ensure minimum 1 minute per photo within each stage
  const stages: Array<{ photos: TimelinePhotoInput[]; windowStartMs: number; windowEndMs: number }> = [];
  const activeStages = [beforePhotos, duringPhotos, afterPhotos, nonePhotos].filter(a => a.length > 0);

  let cursor = timelineStart.getTime();

  for (let s = 0; s < activeStages.length; s++) {
    const stagePhotos = activeStages[s];
    const proportion = stagePhotos.length / totalPhotos;
    const budgetMs = Math.max(
      (stagePhotos.length - 1) * ONE_MINUTE_MS,
      Math.floor(proportion * totalAvailableMs) - (s < activeStages.length - 1 ? ONE_MINUTE_MS : 0)
    );

    const windowStart = cursor;
    const windowEnd = cursor + budgetMs;

    stages.push({ photos: stagePhotos, windowStartMs: windowStart, windowEndMs: windowEnd });

    // Move cursor past this window + 1 minute gap for the next stage
    cursor = windowEnd + ONE_MINUTE_MS;
  }

  // If the last stage overshoots the effective end, stretch the end
  const lastStage = stages[stages.length - 1];
  if (lastStage.windowEndMs > effectiveEndMs) {
    effectiveEndMs = lastStage.windowEndMs;
  }

  // ─── STEP 6: ASSIGN TIMESTAMPS WITHIN EACH STAGE WINDOW ───
  const orderedPhotos: TimedPhotoOutput[] = [];
  let globalIndex = 0;

  for (const stage of stages) {
    const { photos: stagePhotos, windowStartMs, windowEndMs } = stage;
    const n = stagePhotos.length;

    const stageStepMs = n <= 1
      ? 0
      : (windowEndMs - windowStartMs) / (n - 1);

    for (let j = 0; j < n; j++) {
      let assignedMs: number;
      if (j === 0) {
        assignedMs = windowStartMs;
      } else if (j === n - 1) {
        assignedMs = windowEndMs;
      } else {
        assignedMs = Math.round(windowStartMs + j * stageStepMs);
      }

      // Enforce strictly after previous photo (global)
      if (orderedPhotos.length > 0) {
        const prevMs = orderedPhotos[orderedPhotos.length - 1].timestamp.getTime();
        if (assignedMs <= prevMs) {
          assignedMs = prevMs + ONE_MINUTE_MS;
        }
      }

      const photoDate = new Date(assignedMs);
      photoDate.setSeconds(0, 0);

      // After zeroing seconds, re-check strict monotonicity
      if (orderedPhotos.length > 0) {
        const prevDate = orderedPhotos[orderedPhotos.length - 1].timestamp;
        if (photoDate.getTime() <= prevDate.getTime()) {
          photoDate.setTime(prevDate.getTime() + ONE_MINUTE_MS);
        }
      }

      const output: TimedPhotoOutput = {
        id: stagePhotos[j].id,
        category: stagePhotos[j].category,
        timelineIndex: globalIndex,
        timestamp: photoDate,
        timeString12h: format12h(photoDate),
      };

      orderedPhotos.push(output);
      photoMap.set(output.id, output);
      globalIndex++;
    }
  }

  // ─── STEP 7: GLOBAL CROSS-CATEGORY VALIDATION & AUTO-CORRECTION ───
  // This is the critical step. We do NOT just check adjacent pairs.
  // We check EVERY photo in one category against EVERY photo in the next category.

  const beforeResults = orderedPhotos.filter(p => p.category === "before");
  const duringResults = orderedPhotos.filter(p => p.category === "during");
  const afterResults  = orderedPhotos.filter(p => p.category === "after");

  // Auto-correction pass: fix any violation before final validation
  autoCorrectCrossCategoryViolations(beforeResults, duringResults, afterResults, orderedPhotos, photoMap);

  // ─── STEP 8: FINAL HARD GLOBAL VALIDATION ───
  // Rule: Latest Before < Earliest During < Earliest After
  // Rule: Every Before < Every During < Every After

  // 8a. Sequential monotonicity
  for (let i = 1; i < orderedPhotos.length; i++) {
    const prev = orderedPhotos[i - 1];
    const curr = orderedPhotos[i];
    if (curr.timestamp.getTime() <= prev.timestamp.getTime()) {
      throw new Error(
        `TIMELINE VALIDATION FAILED: Photo #${curr.timelineIndex + 1} (${curr.id} [${curr.category}] - ${curr.timeString12h}) ` +
        `is not strictly later than Photo #${prev.timelineIndex + 1} (${prev.id} [${prev.category}] - ${prev.timeString12h})`
      );
    }
  }

  // 8b. Global cross-category: every Before < every During
  if (beforeResults.length > 0 && duringResults.length > 0) {
    const latestBeforeMs = Math.max(...beforeResults.map(p => p.timestamp.getTime()));
    const earliestDuringMs = Math.min(...duringResults.map(p => p.timestamp.getTime()));
    if (latestBeforeMs >= earliestDuringMs) {
      throw new Error(
        `GLOBAL VALIDATION FAILED: Latest Before (${format12h(new Date(latestBeforeMs))}) ` +
        `must be strictly earlier than earliest During (${format12h(new Date(earliestDuringMs))})`
      );
    }
    // Full cross check: every single Before vs every single During
    for (const bp of beforeResults) {
      for (const dp of duringResults) {
        if (bp.timestamp.getTime() >= dp.timestamp.getTime()) {
          throw new Error(
            `GLOBAL VALIDATION FAILED: Before photo "${bp.id}" (${bp.timeString12h}) ` +
            `must be strictly earlier than During photo "${dp.id}" (${dp.timeString12h})`
          );
        }
      }
    }
  }

  // 8c. Global cross-category: every During < every After
  if (duringResults.length > 0 && afterResults.length > 0) {
    const latestDuringMs = Math.max(...duringResults.map(p => p.timestamp.getTime()));
    const earliestAfterMs = Math.min(...afterResults.map(p => p.timestamp.getTime()));
    if (latestDuringMs >= earliestAfterMs) {
      throw new Error(
        `GLOBAL VALIDATION FAILED: Latest During (${format12h(new Date(latestDuringMs))}) ` +
        `must be strictly earlier than earliest After (${format12h(new Date(earliestAfterMs))})`
      );
    }
    for (const dp of duringResults) {
      for (const ap of afterResults) {
        if (dp.timestamp.getTime() >= ap.timestamp.getTime()) {
          throw new Error(
            `GLOBAL VALIDATION FAILED: During photo "${dp.id}" (${dp.timeString12h}) ` +
            `must be strictly earlier than After photo "${ap.id}" (${ap.timeString12h})`
          );
        }
      }
    }
  }

  // 8d. Global cross-category: every Before < every After
  if (beforeResults.length > 0 && afterResults.length > 0) {
    for (const bp of beforeResults) {
      for (const ap of afterResults) {
        if (bp.timestamp.getTime() >= ap.timestamp.getTime()) {
          throw new Error(
            `GLOBAL VALIDATION FAILED: Before photo "${bp.id}" (${bp.timeString12h}) ` +
            `must be strictly earlier than After photo "${ap.id}" (${ap.timeString12h})`
          );
        }
      }
    }
  }

  // ─── STEP 9: POPULATE SECTION SUMMARIES ───
  const getSectionSummary = (cat: PhotoTimelineCategory): TimelineSectionSummary | undefined => {
    const catPhotos = orderedPhotos.filter((p) => p.category === cat);
    if (catPhotos.length === 0) return undefined;
    return {
      start: catPhotos[0].timestamp,
      end: catPhotos[catPhotos.length - 1].timestamp,
      count: catPhotos.length,
    };
  };

  sections.before = getSectionSummary("before");
  sections.during = getSectionSummary("during");
  sections.after = getSectionSummary("after");
  sections.none = getSectionSummary("none");

  return { orderedPhotos, photoMap, sections };
}

/**
 * Auto-correction: if any cross-category violation exists, push the
 * violating timestamps forward so they satisfy the strict ordering rule.
 * This runs BEFORE the final validation so violations are fixed, not just detected.
 */
function autoCorrectCrossCategoryViolations(
  beforeResults: TimedPhotoOutput[],
  duringResults: TimedPhotoOutput[],
  afterResults: TimedPhotoOutput[],
  orderedPhotos: TimedPhotoOutput[],
  photoMap: Map<string, TimedPhotoOutput>,
): void {
  // Fix During: every During must be > latest Before
  if (beforeResults.length > 0 && duringResults.length > 0) {
    const latestBeforeMs = Math.max(...beforeResults.map(p => p.timestamp.getTime()));
    let prevMs = latestBeforeMs;
    for (const dp of duringResults) {
      const requiredMs = prevMs + ONE_MINUTE_MS;
      if (dp.timestamp.getTime() < requiredMs) {
        const corrected = new Date(requiredMs);
        corrected.setSeconds(0, 0);
        if (corrected.getTime() <= prevMs) {
          corrected.setTime(prevMs + ONE_MINUTE_MS);
        }
        dp.timestamp = corrected;
        dp.timeString12h = format12h(corrected);
        photoMap.set(dp.id, dp);
      }
      prevMs = dp.timestamp.getTime();
    }
  }

  // Fix After: every After must be > latest During
  const allBeforeAndDuring = [...beforeResults, ...duringResults];
  if (allBeforeAndDuring.length > 0 && afterResults.length > 0) {
    const latestPriorMs = Math.max(...allBeforeAndDuring.map(p => p.timestamp.getTime()));
    let prevMs = latestPriorMs;
    for (const ap of afterResults) {
      const requiredMs = prevMs + ONE_MINUTE_MS;
      if (ap.timestamp.getTime() < requiredMs) {
        const corrected = new Date(requiredMs);
        corrected.setSeconds(0, 0);
        if (corrected.getTime() <= prevMs) {
          corrected.setTime(prevMs + ONE_MINUTE_MS);
        }
        ap.timestamp = corrected;
        ap.timeString12h = format12h(corrected);
        photoMap.set(ap.id, ap);
      }
      prevMs = ap.timestamp.getTime();
    }
  }

  // Re-sequence timeline indices based on final order
  for (let i = 0; i < orderedPhotos.length; i++) {
    orderedPhotos[i].timelineIndex = i;
  }
}
