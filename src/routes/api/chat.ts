import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `You are SmartHR AI, a helpful HR assistant embedded in an HR management platform.
You help HR managers, team leaders and employees with:
- HR policy questions (leave, code of conduct, benefits)
- Drafting professional HR documents and emails (offer letters, warnings, welcome messages)
- Onboarding checklists and procedures
- Interpreting workforce data
Be concise, professional, and warm. Use markdown formatting where helpful. If a question requires
company-specific policy that you don't have, say so and suggest how the HR team can add it.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const body = (await request.json()) as { messages?: Array<{ role: string; content: string }> };
        const userMessages = Array.isArray(body.messages) ? body.messages : [];

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            stream: true,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...userMessages],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text();
          if (upstream.status === 429) return new Response("Rate limit reached. Please try again shortly.", { status: 429 });
          if (upstream.status === 402) return new Response("AI credits exhausted. Add credits in Workspace settings.", { status: 402 });
          return new Response(text || "AI request failed", { status: upstream.status });
        }

        // Parse SSE from OpenAI-compatible stream and emit plain text tokens
        const stream = new ReadableStream({
          async start(controller) {
            const reader = upstream.body!.getReader();
            const decoder = new TextDecoder();
            const encoder = new TextEncoder();
            let buffer = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const payload = trimmed.slice(5).trim();
                  if (payload === "[DONE]") { controller.close(); return; }
                  try {
                    const json = JSON.parse(payload);
                    const delta = json.choices?.[0]?.delta?.content;
                    if (typeof delta === "string" && delta.length) {
                      controller.enqueue(encoder.encode(delta));
                    }
                  } catch { /* ignore parse errors */ }
                }
              }
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
