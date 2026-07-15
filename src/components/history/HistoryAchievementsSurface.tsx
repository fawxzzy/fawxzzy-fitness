import type { HistoryAchievement } from "@/lib/history-achievements";
import { HistoryCompactDisclosure } from "./HistoryMetricsDisclosure";

export function HistoryAchievementsSurface({ achievements }: { achievements: HistoryAchievement[] }) {
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  return (
    <section data-history-achievements-disclosure="true">
      <HistoryCompactDisclosure
        title="Achievements"
        summaryItems={[`${unlockedCount}/${achievements.length} earned`]}
        accentTone="green"
      >
        <div className="px-3 pb-4 pt-4 sm:px-4">
          <p className="text-sm font-semibold text-[rgb(var(--text-primary)/0.96)]">Training milestones</p>
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
        </div>
      </HistoryCompactDisclosure>
    </section>
  );
}
