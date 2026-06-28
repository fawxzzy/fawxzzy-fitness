export async function GET(request: Request) {
  void request;
  return Response.json({
    ok: false,
    message: "DiscordOS now owns message-command polling. This Fitness endpoint is retired.",
  }, {
    status: 410,
    headers: {
      "cache-control": "no-store",
    },
  });
}
