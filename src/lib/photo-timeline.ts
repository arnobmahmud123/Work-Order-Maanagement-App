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
}

export interface ContinuousPhotoTimeline {
  /** Timestamp for every categorized photo, expressed as absolute minutes. */
  photoMinutes: Map<string, number>;
  /** The calculated start and final-photo time for each non-empty category. */
  sections: Partial<Record<TimedPhotoCategory, TimelineRange>>;
}

const CATEGORY_ORDER: TimedPhotoCategory[] = ["before", "during", "after"];

/**
 * Assign photo times as one continuous Before → During → After sequence.
 *
 * The first populated category uses its configured start. Every later populated
 * category starts exactly one minute after the prior populated category's final
 * assigned photo. A supplied end time is the section's final photo time; when it
 * is omitted, photos receive a one-minute cadence. An end time that is earlier
 * than the derived start is corrected forward; it never rolls into an unseen
 * next day and therefore can never make categories look out of order.
 */
export function createContinuousPhotoTimeline(
  photos: TimelinePhoto[],
  ranges: Partial<Record<TimedPhotoCategory, { start: number; end: number }>>
): ContinuousPhotoTimeline {
  const photoMinutes = new Map<string, number>();
  const sections: ContinuousPhotoTimeline["sections"] = {};
  let previousLast = -1;

  for (const category of CATEGORY_ORDER) {
    const categoryPhotos = photos
      .filter((photo) => photo.category === category)
      .sort((a, b) => a.sortValue - b.sortValue || a.id.localeCompare(b.id));

    if (categoryPhotos.length === 0) continue;

    const count = categoryPhotos.length;
    const configuredRange = ranges[category];
    let start = configuredRange?.start ?? -1;

    // Hard boundary enforcement: start must be strictly AFTER previous category's final photo
    if (previousLast >= 0) {
      if (start < 0 || start <= previousLast) {
        start = previousLast + 1;
      }
    }

    if (start < 0) {
      start = 600; // Default to 10:00 AM if unconfigured
    }

    let end = configuredRange?.end ?? -1;
    // End must allow at least 1 minute per photo so no photos share duplicate timestamps
    const minRequiredEnd = start + count - 1;
    if (end < minRequiredEnd) {
      end = minRequiredEnd;
    }

    const step = count <= 1 ? 0 : (end - start) / (count - 1);
    categoryPhotos.forEach((photo, index) => {
      // Use monotonic minute progression
      const minute = index === count - 1 ? end : Math.round(start + index * step);
      photoMinutes.set(photo.id, minute);
    });

    previousLast = end;
    sections[category] = { start, end };
  }

  return { photoMinutes, sections };
}

export function formatTimelineMinute(minutes: number): string {
  const clockMinutes = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(clockMinutes / 60);
  const minute = clockMinutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}
