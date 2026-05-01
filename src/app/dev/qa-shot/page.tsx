import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";

export const dynamic = "force-dynamic";

const qaDir = path.join(process.cwd(), "public", "qa");

async function listShots() {
  try {
    const entries = await fs.readdir(qaDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));
  } catch {
    return [];
  }
}

export default async function QaShotPage({
  searchParams,
}: {
  searchParams?: {
    file?: string;
  };
}) {
  const files = await listShots();
  const requestedFile = typeof searchParams?.file === "string" ? searchParams.file : null;
  const activeFile = requestedFile && files.includes(requestedFile)
    ? requestedFile
    : (files[0] ?? null);

  return (
    <main className="min-h-screen bg-[#07111a] px-4 py-6 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">QA Screenshot Viewer</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Rendered captures</h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Open screenshots here when the chat renderer fails. Files are served from <code>/public/qa</code>.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Files</div>
            {files.length === 0 ? (
              <p className="text-sm text-slate-400">No screenshots found in <code>public/qa</code>.</p>
            ) : (
              <ul className="space-y-2">
                {files.map((file) => {
                  const selected = file === activeFile;
                  return (
                    <li key={file}>
                      <Link
                        href={`/dev/qa-shot?file=${encodeURIComponent(file)}`}
                        className={[
                          "block rounded-2xl border px-3 py-2 text-sm transition-colors",
                          selected
                            ? "border-cyan-300/50 bg-cyan-300/12 text-white"
                            : "border-white/10 bg-black/10 text-slate-300 hover:border-white/20 hover:bg-white/5 hover:text-white",
                        ].join(" ")}
                      >
                        {file}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
            {activeFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Active file</div>
                    <div className="mt-1 text-sm text-white">{activeFile}</div>
                  </div>
                  <a
                    href={`/qa/${activeFile}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-cyan-300/35 bg-cyan-300/12 px-4 py-2 text-sm font-medium text-cyan-100"
                  >
                    Open raw image
                  </a>
                </div>

                <div className="overflow-auto rounded-2xl border border-white/10 bg-[#02060a] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/qa/${activeFile}`}
                    alt={activeFile}
                    className="mx-auto h-auto max-w-full rounded-xl"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No screenshot selected.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
