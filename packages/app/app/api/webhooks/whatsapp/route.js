import { NextResponse } from "next/server";

export const runtime = "nodejs";

const json = (body, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function generateReply(text, from) {
  const apiKey = env("OPENAI_API_KEY");
  const model = process.env.TIMEOE_AI_MODEL || "gpt-5.6";
  const system =
    process.env.TIMEOE_WHATSAPP_SYSTEM_PROMPT ||
    "You are TIMEŒ Command, an execution-oriented business assistant. Be concise, practical, and do not claim an action was completed unless it actually was. For financial, legal, account, or external side effects, ask for confirmation before executing unless an explicit approval policy is already configured.";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: system,
      input: `WhatsApp sender: ${from}\nUser message: ${text}`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 500)}`);
  }

  const data = await response.json();
  return data.output_text?.trim() || "I received your message, but I could not generate a response.";
}

async function sendWhatsAppText(to, text) {
  const token = env("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
  const version = process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";
  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text.slice(0, 4096) },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`WhatsApp send failed (${response.status}): ${detail.slice(0, 500)}`);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) return json({ error: "Webhook is not configured" }, 503);

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return json({ error: "Verification failed" }, 403);
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // WhatsApp Cloud API sends an object with entry[]/changes[]/value/messages[].
  // Ignore status-only callbacks and unrelated events safely.
  const changes = payload?.entry?.flatMap((entry) => entry.changes || []) || [];

  try {
    for (const change of changes) {
      const value = change?.value;
      const messages = value?.messages || [];

      for (const message of messages) {
        if (message.type !== "text" || !message.from || !message.text?.body) continue;

        const reply = await generateReply(message.text.body, message.from);
        await sendWhatsAppText(message.from, reply);
      }
    }

    return json({ ok: true });
  } catch (error) {
    console.error("WhatsApp webhook processing failed", error);
    // Return 200 so Meta does not repeatedly redeliver a callback while an
    // operator fixes configuration. The error is recorded in Vercel logs.
    return json({ ok: false, error: "Processing failed" });
  }
}
