import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Send, Trash2, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({ meta: [{ title: "AI Assistant — SmartHR AI" }] }),
  component: ChatPage,
});

type Msg = { id: string; role: "user" | "assistant" | "system"; content: string; created_at?: string };

function ChatPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: threads } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const { data } = await supabase.from("chat_threads").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Msg[]);
    })();
    inputRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const newThread = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase.from("chat_threads").insert({ user_id: u.user.id, title: "New conversation" }).select("id").single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["threads"] });
    navigate({ to: "/chat/$threadId", params: { threadId: data.id } });
  };

  const deleteThread = async (id: string) => {
    await supabase.from("chat_threads").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["threads"] });
    if (id === threadId) {
      const rest = (threads ?? []).filter((t) => t.id !== id);
      if (rest[0]) navigate({ to: "/chat/$threadId", params: { threadId: rest[0].id } });
      else navigate({ to: "/chat" });
    }
  };

  const send = async () => {
    if (!input.trim() || streaming) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const userText = input.trim();
    setInput("");
    const optimisticId = crypto.randomUUID();
    const nextMsgs: Msg[] = [...messages, { id: optimisticId, role: "user", content: userText }];
    setMessages(nextMsgs);
    setStreaming(true);

    // persist user message
    await supabase.from("chat_messages").insert({ thread_id: threadId, user_id: u.user.id, role: "user", content: userText });

    // update title if first message
    if (messages.length === 0) {
      const title = userText.slice(0, 60);
      await supabase.from("chat_threads").update({ title }).eq("id", threadId);
      qc.invalidateQueries({ queryKey: ["threads"] });
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        const errText = await res.text();
        throw new Error(errText || "Chat request failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const assistantId = crypto.randomUUID();
      setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: assistantText } : x)));
      }

      await supabase.from("chat_messages").insert({ thread_id: threadId, user_id: u.user.id, role: "assistant", content: assistantText });
      await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
      qc.invalidateQueries({ queryKey: ["threads"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Threads sidebar */}
      <div className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-muted/30 md:flex">
        <div className="p-3">
          <Button size="sm" className="w-full" onClick={newThread}>
            <Plus className="mr-2 size-4" /> New chat
          </Button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {(threads ?? []).map((t) => (
            <div key={t.id} className={cn("group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent", t.id === threadId && "bg-accent")}>
              <Link
                to="/chat/$threadId"
                params={{ threadId: t.id }}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{t.title}</span>
              </Link>
              <button
                onClick={() => deleteThread(t.id)}
                className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label="Delete thread"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 p-6">
            {messages.length === 0 && !streaming && (
              <div className="mt-16 text-center">
                <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl border border-zinc-700 bg-zinc-900">
                  <div className="size-3 rounded-full bg-emerald-400 blur-[3px]" />
                </div>
                <h2 className="text-lg font-semibold">SmartHR Assistant</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask about policies, leave, onboarding, or draft HR documents.
                </p>
                <div className="mx-auto mt-6 grid max-w-lg gap-2 text-left">
                  {[
                    "Summarize how our leave policy works",
                    "Draft a welcome email for a new engineer",
                    "What should be in a first-day onboarding checklist?",
                  ].map((s) => (
                    <button key={s} onClick={() => setInput(s)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
                    {m.content}
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-[85%] text-foreground dark:prose-invert">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
            {streaming && messages[messages.length - 1]?.role === "user" && (
              <div className="text-sm text-muted-foreground">Thinking…</div>
            )}
          </div>
        </div>

        <div className="border-t border-border/60 bg-background p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask SmartHR anything…"
              rows={1}
              className="min-h-[44px] resize-none"
            />
            <Button onClick={send} disabled={streaming || !input.trim()} size="icon" aria-label="Send">
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
