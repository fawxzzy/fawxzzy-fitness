import { appTokens } from "@/components/ui/app/tokens";
import type { HistoryAchievement } from "@/lib/history-achievements";

export function AccountAchievementsSection({ achievements }: { achievements: HistoryAchievement[] }) {
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <section data-account-achievements-section="true" className="relative -mx-5 overflow-hidden rounded-[var(--radius-lg)] border border-transparent bg-transparent shadow-none">
      <div className="relative space-y-3 p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className={appTokens.settingsSectionTitle}>Training milestones</p>
          <p className="shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--success-rgb)/0.92)]">
            {unlockedCount}/{achievements.length} earned
          </p>
        </div>
        <div className={appTokens.settingsTwoColumnGrid}>
          {achievements.map((achievement) => (
            <article
              key={achievement.id}
              className={achievement.unlocked
                ? "rounded-xl border border-[rgb(var(--success-rgb)/0.3)] bg-[rgb(var(--success-rgb)/0.1)] px-3 py-3"
                : "rounded-xl border border-[rgb(var(--border-rgb)/0.5)] bg-[rgb(var(--surface-3-rgb)/0.42)] px-3 py-3 opacity-68"}
            >
              <p className="text-sm font-semibold leading-5 text-[rgb(var(--text-primary)/0.96)]">{achievement.title}</p>
              <p className="mt-1 text-xs leading-4 text-[rgb(var(--text-secondary)/0.9)]">{achievement.description}</p>
              <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted)/0.9)]">
                {achievement.unlocked ? "Earned" : "Not earned"}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
