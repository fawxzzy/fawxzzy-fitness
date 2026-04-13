import { CURATED_INTRO_CARDS } from "../constants.ts";

export function CuratedIntroStep() {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.2rem] border border-emerald-300/20 bg-emerald-400/[0.08] px-4 py-4">
        <p className="text-sm font-semibold text-white">A quick setup before the app starts programming around you.</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          You tell us your setup, we shape the future plan around it, and you still stay in control once generation exists.
        </p>
      </div>

      {CURATED_INTRO_CARDS.map((card) => (
        <div key={card.title} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4">
          <p className="text-sm font-semibold text-white">{card.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{card.body}</p>
        </div>
      ))}
    </div>
  );
}
