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
 * is omitted, photos receive a one-minute cadence. End times before their start
 * are treated as a next-day time.
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

    const configuredRange = ranges[category];
    const start = previousLast >= 0 ? previousLast + 1 : configuredRange?.start ?? -1;
    if (start < 0) continue;

    let end = configuredRange?.end ?? -1;
    while (end >= 0 && end < start) end += 1440;
    if (end < start) end = start + categoryPhotos.length - 1;

    const step = categoryPhotos.length === 1 ? 0 : (end - start) / (categoryPhotos.length - 1);
    categoryPhotos.forEach((photo, index) => {
      // The configured end is the last photo's displayed time, including when
      // a section contains only one photo. This keeps the next section anchored
      // to the actual timestamp shown on the prior section's final photo.
      const minute = index === categoryPhotos.length - 1 ? end : start + index * step;
      photoMinutes.set(photo.id, Math.round(minute));
    });

    // The last index is calculated from `end`, but retain it explicitly as the
    // source of truth for the following category's start.
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
