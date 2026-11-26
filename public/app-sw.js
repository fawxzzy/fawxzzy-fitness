const APP_BUILD_ID = "1.0.1-local";
const OFFLINE_HTML = "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\" />\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\" />\n<meta name=\"theme-color\" content=\"#07111b\" />\n<title>Fitness - offline</title>\n<style>\n*{box-sizing:border-box}\nhtml,body{margin:0;min-height:100%;background:#07111b;color:#f1f5f2;font:16px/1.5 system-ui,-apple-system,\"Segoe UI\",sans-serif;-webkit-text-size-adjust:100%}\nbody{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;padding:max(24px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom))}\n.brand{display:flex;align-items:center;justify-content:center;gap:10px;padding:8px 0 0}\n.brand__mark{width:34px;height:34px;border-radius:11px;background:#20974e;color:#04100a;display:grid;place-items:center;font-weight:800;font-size:19px;letter-spacing:-0.02em}\n.brand__name{font-size:19px;font-weight:700;letter-spacing:0.01em}\nmain{flex:1;display:flex;flex-direction:column;justify-content:center;max-width:26rem;width:100%;margin:0 auto}\n.card{position:relative;overflow:hidden;border-radius:20px;background:#0b1724;box-shadow:inset 0 0 0 1px rgba(241,245,242,0.1);padding:24px 22px 22px 26px}\n.card::before{content:\"\";position:absolute;left:0;top:0;bottom:0;width:4px;background:#20974e}\nh1{margin:0 0 8px;font-size:22px;line-height:28px;font-weight:700}\np{margin:0;color:rgba(241,245,242,0.78);font-size:15.5px;line-height:23px}\n.actions{margin-top:22px;display:flex;flex-direction:column;gap:12px}\n.btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:54px;border:0;border-radius:27px;font:inherit;font-size:17px;font-weight:600;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent}\n.btn--primary{background:#20974e;color:#04100a}\n.btn--primary[disabled]{background:rgba(241,245,242,0.07);box-shadow:inset 0 0 0 1px rgba(241,245,242,0.22);color:rgba(241,245,242,0.62);cursor:default}\n.btn--quiet{background:transparent;color:#f1f5f2;box-shadow:inset 0 0 0 1px rgba(241,245,242,0.28)}\n.btn:focus-visible{outline:3px solid #f1f5f2;outline-offset:3px}\n.status:empty{display:none}\n.status{margin-top:14px;font-size:14px;line-height:22px;text-align:center;color:rgba(241,245,242,0.66)}\n.build{margin:16px 0 0;text-align:center;font-size:12.5px;color:rgba(241,245,242,0.5)}\n</style>\n</head>\n<body>\n<div class=\"brand\" aria-hidden=\"true\"><span class=\"brand__mark\">F</span><span class=\"brand__name\">Fitness</span></div>\n<main>\n<section class=\"card\">\n<h1>You are offline</h1>\n<p>This screen needs a connection to open. Anything you already logged on this phone is kept and sends once you are back online.</p>\n<div class=\"actions\">\n<button type=\"button\" class=\"btn btn--primary\" id=\"retry\">Retry</button>\n<a class=\"btn btn--quiet\" href=\"/today\">Back to Today</a>\n</div>\n<p class=\"status\" id=\"status\" role=\"status\" aria-live=\"polite\"></p>\n</section>\n<p class=\"build\">Build: 1.0.1-local</p>\n</main>\n<script>\n(function () {\n  var retry = document.getElementById(\"retry\");\n  var status = document.getElementById(\"status\");\n  function again() {\n    retry.disabled = true;\n    status.textContent = \"Trying again...\";\n    window.location.reload();\n  }\n  retry.addEventListener(\"click\", again);\n  window.addEventListener(\"online\", again);\n  window.addEventListener(\"pageshow\", function (event) { if (event.persisted) { retry.disabled = false; status.textContent = \"\"; } });\n})();\n</script>\n</body>\n</html>";

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_HTML, {
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
      },
    })),
  );
});
