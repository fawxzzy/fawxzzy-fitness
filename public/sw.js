const APP_BUILD_ID = "1.0.0-2026-05-09T23:43:06.601Z";
const OFFLINE_HTML = [
  "<!doctype html>",
  "<html lang=\"en\">",
  "<head>",
  "<meta charset=\"utf-8\" />",
  "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
  "<title>FawxzzyFitness</title>",
  "<style>",
  "body{margin:0;min-height:100vh;display:grid;place-items:center;background:#141922;color:#f5f7fa;font:16px/1.6 system-ui,sans-serif;padding:24px;text-align:center;}",
  "main{max-width:28rem;}",
  "h1{margin:0 0 0.75rem;font-size:1.5rem;}",
  "p{margin:0;color:#c6ced8;}",
  "</style>",
  "</head>",
  "<body>",
  "<main>",
  "<h1>FawxzzyFitness needs a connection</h1>",
  "<p>Reconnect, then reopen the app to continue your workout flow.</p>",
  "<p style=\"margin-top:0.75rem;color:#90a4bc;font-size:0.875rem;\">Build: " + APP_BUILD_ID + "</p>",
  "</main>",
  "</body>",
  "</html>",
].join("");

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
