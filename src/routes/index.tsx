import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Bot, Users, CalendarCheck, ShieldCheck, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    // Redirect signed-in users to the dashboard
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/dashboard" });
    }
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-md bg-primary">
              <div className="size-3 rounded-full bg-primary-foreground/90" />
            </div>
            <span className="font-semibold tracking-tight">SmartHR AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm">Get started</Button></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3" /> Your virtual HR department, powered by AI
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
            Run HR without the paperwork.
          </h1>
          <p className="mt-6 text-pretty text-lg text-muted-foreground">
            SmartHR AI centralises your employees, leave requests, and policies — with a
            24/7 AI assistant that answers questions and drafts documents in seconds.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth">
              <Button size="lg">Start free <ArrowRight className="ml-2 size-4" /></Button>
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Bot, title: "AI HR Assistant", body: "24/7 chatbot for policy questions, leave, onboarding, and document drafting." },
            { icon: Users, title: "Employee database", body: "Centralised profiles, roles, and org structure with role-based access." },
            { icon: CalendarCheck, title: "Leave management", body: "Annual, sick, family, study leave with approval workflows and balances." },
            { icon: BarChart3, title: "Workforce analytics", body: "Headcount, attendance, and pending approvals at a glance." },
            { icon: ShieldCheck, title: "Role-based access", body: "HR managers, executives, team leaders, and employees — each with the right view." },
            { icon: Sparkles, title: "Threaded chats", body: "Save every HR conversation so you can revisit answers any time." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 grid size-10 place-items-center rounded-lg bg-accent text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SmartHR AI
      </footer>
    </div>
  );
}
