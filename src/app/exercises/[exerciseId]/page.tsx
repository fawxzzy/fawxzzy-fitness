import { notFound } from "next/navigation";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { requireUser } from "@/lib/auth";
import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { getExerciseHowToSrc } from "@/lib/exerciseImages";
import { supabaseServer } from "@/lib/supabase/server";

type PageProps = {
  params: {
    exerciseId: string;
  };
  searchParams?: {
    returnTo?: string;
  };
};

const tagClassName = "rounded-full border border-border bg-surface-2-soft px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted";

function MetaTag({ value }: { value: string | null }) {
  if (!value) return null;
  return <span className={tagClassName}>{value}</span>;
}

export default async function ExerciseDetailsPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, slug, how_to_short, primary_muscles, secondary_muscles, movement_pattern, equipment, image_icon_path, image_muscles_path")
    .eq("id", params.exerciseId)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .maybeSingle();

  const fallbackExercise = EXERCISE_OPTIONS.find((exercise) => exercise.id === params.exerciseId);

  if (error || (!data && !fallbackExercise)) {
    notFound();
  }

  const exercise = data
    ? {
        ...data,
        primary_muscles: data.primary_muscles ?? [],
        secondary_muscles: data.secondary_muscles ?? [],
      }
    : fallbackExercise
      ? {
          id: fallbackExercise.id,
          name: fallbackExercise.name,
          slug: null,
          how_to_short: fallbackExercise.how_to_short,
          primary_muscles: fallbackExercise.primary_muscle ? [fallbackExercise.primary_muscle] : [],
          secondary_muscles: [],
          movement_pattern: fallbackExercise.movement_pattern,
          equipment: fallbackExercise.equipment,
          image_icon_path: null,
          image_muscles_path: null,
        }
      : null;

  const returnHref = searchParams?.returnTo?.startsWith("/") ? searchParams.returnTo : undefined;
  if (!exercise) {
    notFound();
  }

  const primaryMuscles = (exercise.primary_muscles ?? []) as string[];
  const secondaryMuscles = (exercise.secondary_muscles ?? []) as string[];
  const howToImageSrc = getExerciseHowToSrc({
    name: exercise.name,
    slug: exercise.slug,
    image_icon_path: exercise.image_icon_path,
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Exercise info</h1>
        <TopRightBackButton href={returnHref} />
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <p className="text-base font-semibold text-text">{exercise.name}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <MetaTag value={exercise.equipment} />
            <MetaTag value={exercise.movement_pattern} />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted">How-to</p>
          <ExerciseAssetImage src={howToImageSrc} alt="How-to visual" className="w-full rounded-md border border-border" />
        </div>

        {exercise.image_muscles_path ? (
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted">Muscles</p>
            <ExerciseAssetImage src={exercise.image_muscles_path} alt="Muscles visual" className="w-full rounded-md border border-border" fallbackSrc="/exercises/placeholders/muscles.svg" />
          </div>
        ) : null}

        {exercise.how_to_short ? <p className="text-sm text-text">{exercise.how_to_short}</p> : null}

        {primaryMuscles.length > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Primary muscles</p>
            <div className="mt-1 flex flex-wrap gap-1">{primaryMuscles.map((item: string) => <span key={item} className={tagClassName}>{item}</span>)}</div>
          </div>
        ) : null}

        {secondaryMuscles.length > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Secondary muscles</p>
            <div className="mt-1 flex flex-wrap gap-1">{secondaryMuscles.map((item: string) => <span key={item} className={tagClassName}>{item}</span>)}</div>
          </div>
        ) : null}

      </div>
    </section>
  );
}
