const encoder = new TextEncoder();

function bytesToBase64(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function verifyLineSignature(bodyText, signature, channelSecret) {
  if (!signature || !channelSecret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
  return bytesToBase64(new Uint8Array(digest)) === signature;
}

function normalizeTextEvents(payload) {
  return (payload.events || [])
    .filter((event) => event?.type === "message" && event?.message?.type === "text")
    .map((event) => ({
      source: "line",
      event_id: String(event.webhookEventId || event.message.id || ""),
      user_id: String(event.source?.userId || ""),
      message_text: String(event.message?.text || "").trim(),
      timestamp: Number(event.timestamp || 0),
    }))
    .filter((event) => event.message_text.length > 0);
}

async function forwardToPrivateSink(records, env) {
  if (!env.PRIVATE_SINK_URL || !env.PRIVATE_SINK_SHARED_SECRET) {
    // Safe default: validate successfully but do not persist until private sink is configured.
    return { forwarded: 0, sink_configured: false };
  }
  let forwarded = 0;
  for (const record of records) {
    const res = await fetch(env.PRIVATE_SINK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-base-shared-secret": env.PRIVATE_SINK_SHARED_SECRET,
      },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(`private sink failed: ${res.status}`);
    forwarded += 1;
  }
  return { forwarded, sink_configured: true };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, service: "base-line-webhook", sends_messages: false });
    }
    if (request.method !== "POST" || url.pathname !== "/webhook") {
      return new Response("Not found", { status: 404 });
    }

    const bodyText = await request.text();
    const signature = request.headers.get("x-line-signature") || "";
    const valid = await verifyLineSignature(bodyText, signature, env.LINE_CHANNEL_SECRET || "");
    if (!valid) return new Response("Invalid signature", { status: 401 });

    const payload = JSON.parse(bodyText || "{}");
    const records = normalizeTextEvents(payload);
    const result = await forwardToPrivateSink(records, env);

    // LINE only needs a fast 2xx acknowledgment. No reply API call is made here.
    return Response.json({ ok: true, accepted: records.length, ...result });
  },
};

export { verifyLineSignature, normalizeTextEvents };
