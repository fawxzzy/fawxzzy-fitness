import { CardChip, CardChips, CardHeader, CardMeta, CardSurface, cardTokens } from "@/components/ui/card-system";
import type { HistoryAchievement } from "@/lib/history-achievements";

export function AccountAchievementsSection({ achievements }: { achievements: HistoryAchievement[] }) {
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <section data-account-achievements-section="true" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h3 className="m-0 text-base font-semibold leading-snug text-[rgb(var(--text-primary))]">Training milestones</h3>
        <p className="m-0 shrink-0 text-xs font-semibold text-[rgb(var(--text-secondary)/0.95)]">
          {unlockedCount}/{achievements.length} earned
        </p>
      </div>
      <ul className={cardTokens.list}>
        {achievements.map((achievement) => (
          <li key={achievement.id}>
            <CardSurface tone={achievement.unlocked ? "completed" : "neutral"} data-achievement-id={achievement.id}>
              <CardHeader
                title={achievement.title}
                meta={<CardMeta items={[achievement.description]} />}
                headingLevel={4}
                chips={(
                  <CardChips>
                    {achievement.unlocked
                      ? <CardChip tone="success" glyph={"✓"}>Earned</CardChip>
                      : <CardChip tone="neutral">Not earned</CardChip>}
                  </CardChips>
                )}
              />
            </CardSurface>
          </li>
        ))}
      </ul>
    </section>
  );
}
