export type FreshnessState = "overdue" | "due_soon" | "fresh" | "untracked";

export interface FreshnessResult {
  state: FreshnessState;
  label: string;
  badgeText: string;
  daysRemaining: number | null;
  formattedDate: string | null;
  statusClass: string;
}

/**
 * Evaluates brand source freshness against current calendar date.
 * Returns human-readable plain language status strings.
 */
export function calculateFreshness(
  reviewBy: string | null | undefined,
  now: Date = new Date()
): FreshnessResult {
  if (!reviewBy) {
    return {
      state: "untracked",
      label: "Continuous verification (No fixed review date)",
      badgeText: "Continuous",
      daysRemaining: null,
      formattedDate: null,
      statusClass: "bg-paper-sunken text-ink-soft border-rule",
    };
  }

  const reviewDate = new Date(reviewBy);
  if (isNaN(reviewDate.getTime())) {
    return {
      state: "untracked",
      label: "Invalid review date format",
      badgeText: "Invalid",
      daysRemaining: null,
      formattedDate: reviewBy,
      statusClass: "bg-paper-sunken text-ink-soft border-rule",
    };
  }

  // Normalize dates to midnight UTC for day difference
  const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const utcReview = Date.UTC(
    reviewDate.getFullYear(),
    reviewDate.getMonth(),
    reviewDate.getDate()
  );

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.round((utcReview - utcNow) / msPerDay);

  const formattedDate = reviewDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (daysDiff < 0) {
    const overdueDays = Math.abs(daysDiff);
    return {
      state: "overdue",
      label: `Overdue by ${overdueDays} ${overdueDays === 1 ? "day" : "days"} (Expired ${formattedDate})`,
      badgeText: `Overdue (${overdueDays}d)`,
      daysRemaining: daysDiff,
      formattedDate,
      statusClass: "bg-oxblood-tint text-oxblood border-oxblood/30",
    };
  }

  if (daysDiff <= 30) {
    return {
      state: "due_soon",
      label:
        daysDiff === 0
          ? `Review due today (${formattedDate})`
          : `Review due in ${daysDiff} ${daysDiff === 1 ? "day" : "days"} (${formattedDate})`,
      badgeText: daysDiff === 0 ? "Due Today" : `Due in ${daysDiff}d`,
      daysRemaining: daysDiff,
      formattedDate,
      statusClass: "bg-ochre-tint text-ochre border-ochre/30",
    };
  }

  return {
    state: "fresh",
    label: `Verified & current (Review due ${formattedDate})`,
    badgeText: "Fresh",
    daysRemaining: daysDiff,
    formattedDate,
    statusClass: "bg-moss-tint text-moss border-moss/30",
  };
}

