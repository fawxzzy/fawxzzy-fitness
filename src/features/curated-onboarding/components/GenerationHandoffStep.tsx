import type { CuratedGenerationStatus, CuratedOnboardingData } from "../types.ts";

function getStatusCopy(status: CuratedGenerationStatus) {
  if (status === "queued") {
    return {
      title: "Saving the handoff",
      body: "The intake is locked and the placeholder engine request is being exercised now.",
      toneClassName: "border-amber-300/20 bg-amber-400/[0.08]",
    };
  }

  if (status === "ready") {
    return {
      title: "Plan placeholder ready",
      body: "The contract returned a ready placeholder, but real plan preview work is still out of scope.",
      toneClassName: "border-emerald-300/20 bg-emerald-400/[0.08]",
    };
  }

  if (status === "failed") {
    return {
      title: "The placeholder handoff failed",
      body: "Your intake is still saved. Real generation is not implemented yet, so this does not block you from coming back later.",
      toneClassName: "border-red-300/20 bg-red-400/[0.08]",
    };
  }

  if (status === "not-implemented") {
    return {
      title: "Generation is not implemented yet",
      body: "Your intake is saved, the contract is wired, and you can return later when the real curated engine exists.",
      toneClassName: "border-emerald-300/20 bg-emerald-400/[0.08]",
    };
  }

  return {
    title: "Intake saved locally",
    body: "The intake is complete. This placeholder is holding the spot where real generation will take over later.",
    toneClassName: "border-white/10 bg-white/[0.03]",
  };
}

function formatGenerationStatus(status: CuratedGenerationStatus) {
  if (status === "not-implemented") {
    return "Not implemented";
  }

  if (status === "queued") {
    return "Queued";
  }

  if (status === "ready") {
    return "Ready";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Idle";
}

export function GenerationHandoffStep({
  data,
  generationStatus,
}: {
  data: CuratedOnboardingData;
  generationStatus: CuratedGenerationStatus;
}) {
  const copy = getStatusCopy(generationStatus);

  return (
    <div className="space-y-4">
      <div className={`rounded-[1.2rem] border px-4 py-4 ${copy.toneClassName}`}>
        <p className="text-sm font-semibold text-white">{copy.title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">{copy.body}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Intake status</p>
          <p className="mt-2 text-sm font-semibold text-white">Completed</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Generation status</p>
          <p className="mt-2 text-sm font-semibold text-white">{formatGenerationStatus(generationStatus)}</p>
        </div>
      </div>

      <div className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Saved intake snapshot</p>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-200">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
