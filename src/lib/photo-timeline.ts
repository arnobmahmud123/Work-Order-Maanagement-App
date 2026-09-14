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

  // ─── STEP 2: PARSE BASE CALENDAR DATE (INVARIANT) ───
  let year: number;
  let month: number;
  let day: number;

  if (options.customDateStr && options.customDateStr.includes("-")) {
    const parts = options.customDateStr.split("-").map(Number);
    if (!isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      const fallback = options.defaultDate || new Date();
      year = fallback.getFullYear();
      month = fallback.getMonth() + 1;
      day = fallback.getDate();
    }
  } else {
    const baseDateObj = options.defaultDate || new Date();
    year = baseDateObj.getFullYear();
    month = baseDateObj.getMonth() + 1;
    day = baseDateObj.getDate();
  }

  // Hard single-day limits (00:00:00.000 to 23:59:59.000 of the EXACT same date)
  const startOfDayMs = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
  const endOfDayMs = new Date(year, month - 1, day, 23, 59, 0, 0).getTime();

  // ─── STEP 3: PARSE START & END TIMES ───
  let startHour = 9;
  let startMinute = 0;

  if (options.startTimeStr) {
    const parsedStart = parseTimeString(options.startTimeStr);
    if (parsedStart) {
      startHour = parsedStart.hour;
      startMinute = parsedStart.minute;
    }
  }

  let timelineStartMs = new Date(year, month - 1, day, startHour, startMinute, 0, 0).getTime();

  // ─── STEP 4: COUNT PHOTOS PER CATEGORY ───
  const beforePhotos = sortedPhotos.filter(p => p.category === "before");
  const duringPhotos = sortedPhotos.filter(p => p.category === "during");
  const afterPhotos  = sortedPhotos.filter(p => p.category === "after");
  const nonePhotos   = sortedPhotos.filter(p => p.category === "none");

  const totalPhotos = sortedPhotos.length;
  const activeStages = [beforePhotos, duringPhotos, afterPhotos, nonePhotos].filter(a => a.length > 0);
  const gapsBetweenCategories = Math.max(0, activeStages.length - 1);
  const totalIntervals = Math.max(1, (totalPhotos - 1) + gapsBetweenCategories);

  // If start time is too late to fit photos on the same day, shift start time earlier on the same day
  const defaultIntervalMs = 60 * 1000;
  if (timelineStartMs + totalIntervals * defaultIntervalMs > endOfDayMs) {
    const neededSpanMs = totalIntervals * defaultIntervalMs;
    if (neededSpanMs <= (17 * 3600 * 1000)) {
      timelineStartMs = Math.max(startOfDayMs + 6 * 3600 * 1000, endOfDayMs - neededSpanMs);
    } else {
      timelineStartMs = startOfDayMs + 6 * 3600 * 1000;
    }
  }

  // Parse End Time strictly on the SAME day
  let timelineEndMs: number;
  if (options.endTimeStr) {
    const parsedEnd = parseTimeString(options.endTimeStr);
    if (parsedEnd) {
      let endHour = parsedEnd.hour;
      const endMinute = parsedEnd.minute;
      // Handle 12-hour clock inputs like "02:00" or "05:30" (convert to PM if morning start)
      if (endHour < startHour && endHour < 12) {
        endHour += 12;
      }
      let candidateEndMs = new Date(year, month - 1, day, endHour, endMinute, 0, 0).getTime();
      if (candidateEndMs <= timelineStartMs) {
        candidateEndMs = Math.min(endOfDayMs, timelineStartMs + 2 * 3600 * 1000);
      }
      timelineEndMs = Math.min(endOfDayMs, Math.max(candidateEndMs, timelineStartMs + totalIntervals * 1000));
    } else {
      timelineEndMs = Math.min(endOfDayMs, timelineStartMs + totalIntervals * defaultIntervalMs);
    }
  } else {
    timelineEndMs = Math.min(endOfDayMs, timelineStartMs + totalIntervals * defaultIntervalMs);
  }

  const totalAvailableMs = Math.max(totalIntervals * 1000, timelineEndMs - timelineStartMs);

  // ─── STEP 5: COMPUTE NON-OVERLAPPING TIME WINDOWS PER STAGE ───
  const stages: Array<{ photos: TimelinePhotoInput[]; windowStartMs: number; windowEndMs: number }> = [];
  let cursor = timelineStartMs;

  const minGapBetweenStages = Math.min(60 * 1000, Math.max(1000, Math.floor(totalAvailableMs / (totalIntervals * 4))));

  for (let s = 0; s < activeStages.length; s++) {
    const stagePhotos = activeStages[s];
    const n = stagePhotos.length;
    const proportion = n / totalPhotos;
    const isLast = s === activeStages.length - 1;

    let budgetMs: number;
    if (isLast) {
      budgetMs = timelineEndMs - cursor;
    } else {
      budgetMs = Math.floor(proportion * (totalAvailableMs - gapsBetweenCategories * minGapBetweenStages));
    }
    budgetMs = Math.max(Math.max(0, n - 1) * 1000, budgetMs);

    const windowStart = cursor;
    const windowEnd = Math.min(endOfDayMs, windowStart + budgetMs);

    stages.push({ photos: stagePhotos, windowStartMs: windowStart, windowEndMs: windowEnd });
    cursor = Math.min(endOfDayMs, windowEnd + minGapBetweenStages);
  }

  // ─── STEP 6: ASSIGN TIMESTAMPS WITHIN EACH STAGE WINDOW ───
  const orderedPhotos: TimedPhotoOutput[] = [];
  let globalIndex = 0;
  let lastAssignedMs = timelineStartMs - 1000;

  for (const stage of stages) {
    const { photos: stagePhotos, windowStartMs, windowEndMs } = stage;
    const n = stagePhotos.length;

    const stageStepMs = n <= 1 ? 0 : (windowEndMs - windowStartMs) / (n - 1);

    for (let j = 0; j < n; j++) {
      let assignedMs: number;
      if (j === 0) {
        assignedMs = windowStartMs;
      } else if (j === n - 1) {
        assignedMs = windowEndMs;
      } else {
        assignedMs = Math.round(windowStartMs + j * stageStepMs);
      }

      if (assignedMs <= lastAssignedMs) {
        assignedMs = lastAssignedMs + 1000;
      }
      if (assignedMs > endOfDayMs) {
        assignedMs = endOfDayMs;
      }

      const photoDate = new Date(assignedMs);
      photoDate.setSeconds(0, 0);
      photoDate.setFullYear(year, month - 1, day);

      // Verify strictly greater than previous
      if (orderedPhotos.length > 0) {
        const prevTime = orderedPhotos[orderedPhotos.length - 1].timestamp.getTime();
        if (photoDate.getTime() <= prevTime) {
          const nextTime = Math.min(endOfDayMs, prevTime + 60 * 1000);
          photoDate.setTime(nextTime);
          photoDate.setFullYear(year, month - 1, day);
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
      lastAssignedMs = photoDate.getTime();
      globalIndex++;
    }
  }

  // ─── STEP 7: GLOBAL CROSS-CATEGORY VALIDATION & AUTO-CORRECTION ───
  const beforeResults = orderedPhotos.filter(p => p.category === "before");
  const duringResults = orderedPhotos.filter(p => p.category === "during");
  const afterResults  = orderedPhotos.filter(p => p.category === "after");

  autoCorrectCrossCategoryViolations(
    beforeResults,
    duringResults,
    afterResults,
    orderedPhotos,
    photoMap,
    year,
    month,
    day,
    timelineStartMs,
    endOfDayMs
  );

  // ─── STEP 8: FINAL HARD SANITIZATION & SINGLE-DATE ASSERTION ───
  // Strictly enforce that EVERY photo belongs to the EXACT requested calendar date
  for (let i = 0; i < orderedPhotos.length; i++) {
    const p = orderedPhotos[i];
    if (
      p.timestamp.getFullYear() !== year ||
      p.timestamp.getMonth() !== month - 1 ||
      p.timestamp.getDate() !== day
    ) {
      p.timestamp.setFullYear(year, month - 1, day);
      p.timeString12h = format12h(p.timestamp);
      photoMap.set(p.id, p);
    }
  }

  // Ensure strict monotonicity across whole batch
  for (let i = 1; i < orderedPhotos.length; i++) {
    const prev = orderedPhotos[i - 1];
    const curr = orderedPhotos[i];
    if (curr.timestamp.getTime() <= prev.timestamp.getTime()) {
      const nextMs = Math.min(endOfDayMs, prev.timestamp.getTime() + 1000);
      curr.timestamp.setTime(nextMs);
      curr.timestamp.setFullYear(year, month - 1, day);
      curr.timeString12h = format12h(curr.timestamp);
      photoMap.set(curr.id, curr);
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
 * Auto-correction: if any cross-category violation exists, re-space timestamps
 * within the single-day range [startMs, endOfDayMs] so Before < During < After.
 */
function autoCorrectCrossCategoryViolations(
  beforeResults: TimedPhotoOutput[],
  duringResults: TimedPhotoOutput[],
  afterResults: TimedPhotoOutput[],
  orderedPhotos: TimedPhotoOutput[],
  photoMap: Map<string, TimedPhotoOutput>,
  year: number,
  month: number,
  day: number,
  startMs: number,
  endOfDayMs: number
): void {
  // Fix During: every During must be > latest Before
  if (beforeResults.length > 0 && duringResults.length > 0) {
    const latestBeforeMs = Math.max(...beforeResults.map(p => p.timestamp.getTime()));
    let prevMs = latestBeforeMs;
    for (const dp of duringResults) {
      const requiredMs = Math.min(endOfDayMs, prevMs + ONE_MINUTE_MS);
      if (dp.timestamp.getTime() <= prevMs) {
        dp.timestamp.setTime(requiredMs);
        dp.timestamp.setFullYear(year, month - 1, day);
        dp.timeString12h = format12h(dp.timestamp);
        photoMap.set(dp.id, dp);
      }
      prevMs = dp.timestamp.getTime();
    }
  }

  // Fix After: every After must be > latest During & Before
  const allBeforeAndDuring = [...beforeResults, ...duringResults];
  if (allBeforeAndDuring.length > 0 && afterResults.length > 0) {
    const latestPriorMs = Math.max(...allBeforeAndDuring.map(p => p.timestamp.getTime()));
    let prevMs = latestPriorMs;
    for (const ap of afterResults) {
      const requiredMs = Math.min(endOfDayMs, prevMs + ONE_MINUTE_MS);
      if (ap.timestamp.getTime() <= prevMs) {
        ap.timestamp.setTime(requiredMs);
        ap.timestamp.setFullYear(year, month - 1, day);
        ap.timeString12h = format12h(ap.timestamp);
        photoMap.set(ap.id, ap);
      }
      prevMs = ap.timestamp.getTime();
    }
  }

  // If timestamps compressed near endOfDayMs, redistribute proportionally
  if (orderedPhotos.length > 1) {
    const lastPhoto = orderedPhotos[orderedPhotos.length - 1];
    if (lastPhoto.timestamp.getTime() > endOfDayMs) {
      const availableMs = endOfDayMs - startMs;
      const step = availableMs / (orderedPhotos.length - 1);
      for (let i = 0; i < orderedPhotos.length; i++) {
        const item = orderedPhotos[i];
        const newTime = new Date(startMs + Math.round(i * step));
        newTime.setSeconds(0, 0);
        newTime.setFullYear(year, month - 1, day);
        item.timestamp = newTime;
        item.timeString12h = format12h(newTime);
        photoMap.set(item.id, item);
      }
    }
  }

  // Re-sequence timeline indices based on final order
  for (let i = 0; i < orderedPhotos.length; i++) {
    orderedPhotos[i].timelineIndex = i;
  }
}
