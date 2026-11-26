// The page the service worker shows when a navigation fails because the phone is offline.
// It is self-contained (inline CSS and a few lines of script, no network assets) because it must render with no
// connection. It uses the app's own look: dark base, the one green primary button, plain words, and no red text.

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderOfflineHtml(buildId) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#07111b" />
<title>Fitness - offline</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#07111b;color:#f1f5f2;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-text-size-adjust:100%}
body{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;padding:max(24px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom))}
.brand{display:flex;align-items:center;justify-content:center;gap:10px;padding:8px 0 0}
.brand__mark{width:34px;height:34px;border-radius:11px;background:#20974e;color:#04100a;display:grid;place-items:center;font-weight:800;font-size:19px;letter-spacing:-0.02em}
.brand__name{font-size:19px;font-weight:700;letter-spacing:0.01em}
main{flex:1;display:flex;flex-direction:column;justify-content:center;max-width:26rem;width:100%;margin:0 auto}
.card{position:relative;overflow:hidden;border-radius:20px;background:#0b1724;box-shadow:inset 0 0 0 1px rgba(241,245,242,0.1);padding:24px 22px 22px 26px}
.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#20974e}
h1{margin:0 0 8px;font-size:22px;line-height:28px;font-weight:700}
p{margin:0;color:rgba(241,245,242,0.78);font-size:15.5px;line-height:23px}
.actions{margin-top:22px;display:flex;flex-direction:column;gap:12px}
.btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:54px;border:0;border-radius:27px;font:inherit;font-size:17px;font-weight:600;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.btn--primary{background:#20974e;color:#04100a}
.btn--primary[disabled]{background:rgba(241,245,242,0.07);box-shadow:inset 0 0 0 1px rgba(241,245,242,0.22);color:rgba(241,245,242,0.62);cursor:default}
.btn--quiet{background:transparent;color:#f1f5f2;box-shadow:inset 0 0 0 1px rgba(241,245,242,0.28)}
.btn:focus-visible{outline:3px solid #f1f5f2;outline-offset:3px}
.status:empty{display:none}
.status{margin-top:14px;font-size:14px;line-height:22px;text-align:center;color:rgba(241,245,242,0.66)}
.build{margin:16px 0 0;text-align:center;font-size:12.5px;color:rgba(241,245,242,0.5)}
</style>
</head>
<body>
<div class="brand" aria-hidden="true"><span class="brand__mark">F</span><span class="brand__name">Fitness</span></div>
<main>
<section class="card">
<h1>You are offline</h1>
<p>This screen needs a connection to open. Anything you already logged on this phone is kept and sends once you are back online.</p>
<div class="actions">
<button type="button" class="btn btn--primary" id="retry">Retry</button>
<a class="btn btn--quiet" href="/today">Back to Today</a>
</div>
<p class="status" id="status" role="status" aria-live="polite"></p>
</section>
<p class="build">Build: ${escapeHtml(buildId)}</p>
</main>
<script>
(function () {
  var retry = document.getElementById("retry");
  var status = document.getElementById("status");
  function again() {
    retry.disabled = true;
    status.textContent = "Trying again...";
    window.location.reload();
  }
  retry.addEventListener("click", again);
  window.addEventListener("online", again);
  window.addEventListener("pageshow", function (event) { if (event.persisted) { retry.disabled = false; status.textContent = ""; } });
})();
</script>
</body>
</html>`;
}
