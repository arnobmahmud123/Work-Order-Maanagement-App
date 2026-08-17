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

/**
 * Builds ONE continuous, strictly forward chronological timeline across all photos.
 *
 * Fundamental Architecture:
 * 1. Assemble ALL photos into ONE ordered list: Before -> During -> After -> None.
 * 2. Generate timestamps using ONE sequential loop with real Date arithmetic.
 * 3. Enforce strictly monotonic timestamps: T[i] >= T[i-1] + 1 minute.
 * 4. Run hard validation before returning.
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

  // 1. ORDER ALL PHOTOS: Before -> During -> After -> None
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

  // 2. PARSE BASE DATE (Year, Month, Day)
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

  // 3. PARSE START & END TIMES
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

  const startDate = new Date(year, month - 1, day, startHour, startMinute, 0, 0);

  const parsedEnd = parseTimeString(options.endTimeStr || "");
  let endDate: Date | null = null;
  if (parsedEnd) {
    endDate = new Date(year, month - 1, day, parsedEnd.hour, parsedEnd.minute, 0, 0);
    if (endDate.getTime() <= startDate.getTime()) {
      // Midnight crossing: advance end date to the next day
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  const totalPhotos = sortedPhotos.length;

  // Ensure endDate (if provided) allows at least 1 minute per photo
  const minRequiredEndDate = new Date(startDate.getTime() + (totalPhotos - 1) * 60 * 1000);
  if (endDate && endDate.getTime() < minRequiredEndDate.getTime()) {
    endDate = minRequiredEndDate;
  }

  // 4. ONE SEQUENTIAL GENERATION LOOP
  const stepMs = totalPhotos <= 1 || !endDate
    ? 60 * 1000 // Default 1 minute step
    : (endDate.getTime() - startDate.getTime()) / (totalPhotos - 1);

  const orderedPhotos: TimedPhotoOutput[] = [];
  let lastCategory: PhotoTimelineCategory | null = null;

  for (let i = 0; i < totalPhotos; i++) {
    let assignedMs: number;
    if (i === 0) {
      assignedMs = startDate.getTime();
    } else if (endDate && i === totalPhotos - 1) {
      assignedMs = endDate.getTime();
    } else if (endDate) {
      assignedMs = Math.round(startDate.getTime() + i * stepMs);
    } else {
      assignedMs = startDate.getTime() + i * stepMs;
    }

    // Mathematical Dependency: next photo MUST be strictly after previous photo
    if (i > 0) {
      const prevMs = orderedPhotos[i - 1].timestamp.getTime();
      const currentCat = sortedPhotos[i].category;
      const isNewCategory = currentCat !== lastCategory && lastCategory !== null;
      const minStep = isNewCategory ? 60 * 1000 : 60 * 1000;
      
      if (assignedMs < prevMs + minStep) {
        assignedMs = prevMs + minStep;
      }
    }

    const photoDate = new Date(assignedMs);
    photoDate.setSeconds(0, 0);

    if (i > 0) {
      const prevDate = orderedPhotos[i - 1].timestamp;
      if (photoDate.getTime() <= prevDate.getTime()) {
        photoDate.setTime(prevDate.getTime() + 60 * 1000);
      }
    }

    lastCategory = sortedPhotos[i].category;

    const output: TimedPhotoOutput = {
      id: sortedPhotos[i].id,
      category: sortedPhotos[i].category,
      timelineIndex: i,
      timestamp: photoDate,
      timeString12h: format12h(photoDate),
    };

    orderedPhotos.push(output);
    photoMap.set(output.id, output);
  }

  // 5. HARD VALIDATION PASS OVER THE COMPLETE ARRAY
  for (let i = 1; i < orderedPhotos.length; i++) {
    const prev = orderedPhotos[i - 1];
    const curr = orderedPhotos[i];
    if (curr.timestamp.getTime() <= prev.timestamp.getTime()) {
      throw new Error(
        `TIMELINE VALIDATION FAILED: Photo #${curr.timelineIndex + 1} (${curr.id} - ${curr.timeString12h}) is not later than Photo #${prev.timelineIndex + 1} (${prev.id} - ${prev.timeString12h})`
      );
    }
  }

  // Specific Category Transition Validation
  const beforeList = orderedPhotos.filter(p => p.category === "before");
  const duringList = orderedPhotos.filter(p => p.category === "during");
  const afterList = orderedPhotos.filter(p => p.category === "after");

  if (beforeList.length > 0 && duringList.length > 0) {
    const lastBefore = beforeList[beforeList.length - 1];
    const firstDuring = duringList[0];
    if (firstDuring.timestamp.getTime() <= lastBefore.timestamp.getTime()) {
      throw new Error(
        `TIMELINE ERROR: First During photo (${firstDuring.timeString12h}) is not later than last Before photo (${lastBefore.timeString12h})`
      );
    }
  }

  if (duringList.length > 0 && afterList.length > 0) {
    const lastDuring = duringList[duringList.length - 1];
    const firstAfter = afterList[0];
    if (firstAfter.timestamp.getTime() <= lastDuring.timestamp.getTime()) {
      throw new Error(
        `TIMELINE ERROR: First After photo (${firstAfter.timeString12h}) is not later than last During photo (${lastDuring.timeString12h})`
      );
    }
  }

  // 6. POPULATE SECTION SUMMARIES
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
