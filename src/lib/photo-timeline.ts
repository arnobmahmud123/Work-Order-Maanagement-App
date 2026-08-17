export type PhotoTimelineCategory = "before" | "during" | "after" | "none";
export type TimedPhotoCategory = Exclude<PhotoTimelineCategory, "none">;

export interface TimelinePhoto {
  id: string;
  category: PhotoTimelineCategory;
  /** A stable value used to preserve the capture/upload order within a category. */
  sortValue: number;
}

export interface TimelineRange {
  start: number;
  end: number;
  count: number;
}

export interface ContinuousPhotoTimeline {
  /** Timestamp for every photo, expressed as absolute minutes. */
  photoMinutes: Map<string, number>;
  /** The ordered list of all photos in chronological sequence */
  orderedPhotos: TimelinePhoto[];
  /** The calculated start, end, and photo count for each section. */
  sections: Partial<Record<PhotoTimelineCategory, TimelineRange>>;
}

/**
 * Builds ONE continuous chronological timeline across all photos.
 *
 * Strict Chronological Rules:
 * 1. Ordering: ALL Before photos -> ALL During photos -> ALL After photos -> ALL Uncategorized.
 * 2. Strict Monotonicity: Timestamp(Photo N+1) >= Timestamp(Photo N) + 1 minute.
 * 3. Before -> During transition: First During Photo >= Last Before Photo + 1 minute.
 * 4. During -> After transition: First After Photo >= Last During Photo + 1 minute.
 * 5. Hard Validation Pass: Guarantees zero backwards, duplicate, or overlapping timestamps.
 */
export function buildContinuousPhotoTimeline(
  photos: TimelinePhoto[],
  options: {
    startTimeMinutes: number; // e.g. 720 for 12:00 PM
    endTimeMinutes?: number;   // e.g. 1080 for 6:00 PM
  }
): ContinuousPhotoTimeline {
  const photoMinutes = new Map<string, number>();
  const sections: ContinuousPhotoTimeline["sections"] = {};

  if (photos.length === 0) {
    return { photoMinutes, orderedPhotos: [], sections };
  }

  // 1. ORDER ALL PHOTOS BY CATEGORY: Before -> During -> After -> None
  const bySortValue = (a: TimelinePhoto, b: TimelinePhoto) =>
    a.sortValue !== b.sortValue ? a.sortValue - b.sortValue : a.id.localeCompare(b.id);

  const beforePhotos = photos.filter((p) => p.category === "before").sort(bySortValue);
  const duringPhotos = photos.filter((p) => p.category === "during").sort(bySortValue);
  const afterPhotos = photos.filter((p) => p.category === "after").sort(bySortValue);
  const nonePhotos = photos.filter((p) => p.category === "none").sort(bySortValue);

  const orderedPhotos: TimelinePhoto[] = [
    ...beforePhotos,
    ...duringPhotos,
    ...afterPhotos,
    ...nonePhotos,
  ];

  const totalPhotos = orderedPhotos.length;
  const startMin = options.startTimeMinutes >= 0 ? options.startTimeMinutes : 600; // Default 10:00 AM
  let endMin = options.endTimeMinutes !== undefined && options.endTimeMinutes >= 0 
    ? options.endTimeMinutes 
    : -1;

  if (endMin >= 0 && endMin < startMin) {
    endMin += 1440; // Midnight crossing
  }

  // Ensure endMin allows at least 1 minute per photo
  const minRequiredEnd = startMin + totalPhotos - 1;
  if (endMin < minRequiredEnd) {
    endMin = minRequiredEnd;
  }

  // 2. GENERATE CONTINUOUS TIMELINE (ONE CLOCK ACROSS ALL PHOTOS)
  const step = totalPhotos <= 1 ? 0 : (endMin - startMin) / (totalPhotos - 1);
  const generatedMinutes: number[] = [];

  for (let i = 0; i < totalPhotos; i++) {
    if (i === totalPhotos - 1) {
      generatedMinutes.push(endMin);
    } else {
      generatedMinutes.push(Math.round(startMin + i * step));
    }
  }

  // 3. HARD VALIDATION PASS (NON-NEGOTIABLE SAFETY CONSTRAINT)
  // Every next photo MUST have a timestamp strictly greater than previous photo (+1 min minimum)
  for (let i = 1; i < totalPhotos; i++) {
    if (generatedMinutes[i] <= generatedMinutes[i - 1]) {
      generatedMinutes[i] = generatedMinutes[i - 1] + 1;
    }
  }

  // 4. MAP TO PHOTO IDS AND POPULATE SECTIONS
  orderedPhotos.forEach((photo, index) => {
    photoMinutes.set(photo.id, generatedMinutes[index]);
  });

  const getSectionRange = (catPhotos: TimelinePhoto[]) => {
    if (catPhotos.length === 0) return undefined;
    const firstId = catPhotos[0].id;
    const lastId = catPhotos[catPhotos.length - 1].id;
    return {
      start: photoMinutes.get(firstId)!,
      end: photoMinutes.get(lastId)!,
      count: catPhotos.length,
    };
  };

  sections.before = getSectionRange(beforePhotos);
  sections.during = getSectionRange(duringPhotos);
  sections.after = getSectionRange(afterPhotos);
  sections.none = getSectionRange(nonePhotos);

  return { photoMinutes, orderedPhotos, sections };
}

// Backward compatibility alias for legacy callers
export const createContinuousPhotoTimeline = (
  photos: TimelinePhoto[],
  ranges?: any
) => {
  const start = ranges?.before?.start ?? ranges?.during?.start ?? 600;
  const end = ranges?.after?.end ?? ranges?.during?.end ?? ranges?.before?.end ?? -1;
  return buildContinuousPhotoTimeline(photos, {
    startTimeMinutes: start,
    endTimeMinutes: end,
  });
};

export function formatTimelineMinute(minutes: number): string {
  const clockMinutes = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(clockMinutes / 60);
  const minute = clockMinutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function formatTimelineMinute12h(minutes: number): string {
  const clockMinutes = ((minutes % 1440) + 1440) % 1440;
  let hour = Math.floor(clockMinutes / 60);
  const minute = clockMinutes % 60;
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${period}`;
}
