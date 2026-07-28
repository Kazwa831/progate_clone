import { STREAK_MILESTONES } from "@/lib/studyTime";

type StreakBadgesProps = {
  longestStreak: number;
};

export function StreakBadges({ longestStreak }: StreakBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STREAK_MILESTONES.map((milestone) => {
        const achieved = longestStreak >= milestone;
        return (
          <span
            key={milestone}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
              achieved
                ? "border-success/40 bg-success/10 font-medium text-success-text"
                : "border-border text-muted-foreground"
            }`}
          >
            <span aria-hidden="true">{achieved ? "🏅" : "🔒"}</span>
            {milestone}日連続
          </span>
        );
      })}
    </div>
  );
}
