import { notFound } from "next/navigation";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { requireUser } from "@/lib/auth";
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
    .select("id, name, how_to_short, primary_muscles, secondary_muscles, movement_pattern, equipment, image_howto_path, image_muscles_path")
    .eq("id", params.exerciseId)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const returnHref = searchParams?.returnTo?.startsWith("/") ? searchParams.returnTo : undefined;
  const primaryMuscles = (data.primary_muscles ?? []) as string[];
  const secondaryMuscles = (data.secondary_muscles ?? []) as string[];
  const howToImageSrc = getExerciseHowToSrc({
    name: data.name,
    image_howto_path: data.image_howto_path,
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Exercise info</h1>
        <TopRightBackButton href={returnHref} />
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <p className="text-base font-semibold text-text">{data.name}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <MetaTag value={data.equipment} />
            <MetaTag value={data.movement_pattern} />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted">How-to</p>
          <ExerciseAssetImage src={howToImageSrc} alt="How-to visual" className="w-full rounded-md border border-border" />
        </div>

        {data.image_muscles_path ? (
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted">Muscles</p>
            <ExerciseAssetImage src={data.image_muscles_path} alt="Muscles visual" className="w-full rounded-md border border-border" fallbackSrc="/exercises/placeholders/muscles.svg" />
          </div>
        ) : null}

        {data.how_to_short ? <p className="text-sm text-text">{data.how_to_short}</p> : null}

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
