import { headers } from "next/headers";
import { LiveExerciseInfoPreview } from "@/app/dev/exercise-info-live/LiveExerciseInfoPreview";
import { getExerciseInfoPayload, type ExerciseInfoPayload } from "@/lib/exercise-info";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function ErrorState({ message }: { message: string }) {
  return (
    <main className="app-page-scroll min-h-[100dvh] px-4 py-6">
      <div className="mx-auto max-w-md rounded-[28px] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.9)] px-4 py-5 text-sm text-[rgb(var(--text)/0.92)]">
        {message}
      </div>
    </main>
  );
}

type ExerciseInfoApiSuccess = {
  ok: true;
  payload: ExerciseInfoPayload;
};

export default async function DevExerciseInfoLivePage({
  searchParams,
}: {
  searchParams?: {
    access_token?: string;
    exerciseId?: string;
    scrollTo?: string;
    userId?: string;
  };
}) {
  if (process.env.NODE_ENV === "production") {
    return <ErrorState message="Not found." />;
  }

  const accessToken = searchParams?.access_token?.trim() ?? "";
  const exerciseId = searchParams?.exerciseId?.trim() ?? "";
  const initialScrollY = Number(searchParams?.scrollTo ?? "0");
  const explicitUserId = searchParams?.userId?.trim() ?? "";

  if (!exerciseId) {
    return <ErrorState message="Missing exercise id." />;
  }

  if (accessToken) {
    const headerStore = headers();
    const host = headerStore.get("host") ?? "127.0.0.1:3000";
    const protocol = host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    const response = await fetch(`${protocol}://${host}/api/exercise-info/${encodeURIComponent(exerciseId)}`, {
      cache: "no-store",
      headers: {
        cookie: `sb-access-token=${accessToken}`,
      },
    });

    if (!response.ok) {
      return <ErrorState message="Could not load live exercise info payload." />;
    }

    const payload = (await response.json()) as ExerciseInfoApiSuccess;
    if (!payload?.ok || !payload.payload?.exercise) {
      return <ErrorState message="Live exercise info payload was incomplete." />;
    }

    return (
      <LiveExerciseInfoPreview
        exercise={payload.payload.exercise}
        stats={payload.payload.stats}
        initialScrollY={Number.isFinite(initialScrollY) ? initialScrollY : 0}
      />
    );
  }

  if (!explicitUserId) {
    return <ErrorState message="Missing access token or user id." />;
  }

  const payload = await getExerciseInfoPayload(exerciseId, explicitUserId, undefined, supabaseAdmin());
  if (!payload?.exercise) {
    return <ErrorState message="Exercise not found for this user." />;
  }

  return (
    <LiveExerciseInfoPreview
      exercise={payload.exercise}
      stats={payload.stats}
      initialScrollY={Number.isFinite(initialScrollY) ? initialScrollY : 0}
    />
  );
}
