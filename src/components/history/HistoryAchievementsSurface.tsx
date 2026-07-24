import type { HistoryAchievement } from "@/lib/history-achievements";
import { HistorySection } from "./HistoryShared";

export function HistoryAchievementsSurface({ achievements }: { achievements: HistoryAchievement[] }) {
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  return (
    <HistorySection
      title="Achievements"
      description={`${unlockedCount}/${achievements.length} earned`}
      className="!border-0 !bg-transparent"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[rgb(var(--text-primary)/0.96)]">Training milestones</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {achievements.map((achievement) => (
          <article
            key={achievement.id}
            className={achievement.unlocked
              ? "rounded-xl border border-[rgb(var(--success-rgb)/0.3)] bg-[rgb(var(--success-rgb)/0.12)] p-3"
              : "rounded-xl border border-[rgb(var(--border-rgb)/0.5)] bg-[rgb(var(--surface-3-rgb)/0.42)] p-3 opacity-68"}
          >
            <p className="text-sm font-black text-[rgb(var(--text-primary)/0.96)]">{achievement.title}</p>
            <p className="mt-1 text-xs leading-4 text-[rgb(var(--text-secondary)/0.9)]">{achievement.description}</p>
            <p className="mt-2 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[rgb(var(--text-muted)/0.9)]">
              {achievement.unlocked ? "Earned" : "Not earned"}
            </p>
          </article>
        ))}
      </div>
    </HistorySection>
  );
}
