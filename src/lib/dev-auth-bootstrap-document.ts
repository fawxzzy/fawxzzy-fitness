import { serializeStringForInlineScript } from "@/lib/inline-script";
import { isSafeAppPath } from "@/lib/navigation-return";

/** HTML page of the dev-only /dev/auth/bootstrap-client route: forwards to a safe in-app path (else /today). */
export function renderDevBootstrapDocument({
  nextPath,
}: {
  nextPath: string;
}) {
  const safeNextPath = isSafeAppPath(nextPath) ? nextPath : "/today";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="cache-control" content="no-store" />
    <title>Bootstrapping session</title>
  </head>
  <body>
    <p>Bootstrapping session…</p>
    <script>
      window.setTimeout(() => {
        window.location.replace(${serializeStringForInlineScript(safeNextPath)});
      }, 80);
    </script>
  </body>
</html>`;
}
