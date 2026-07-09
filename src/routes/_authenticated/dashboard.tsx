import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarDays, Clock, TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SmartHR AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: employees } = useQuery({
    queryKey: ["employees-count"],
    queryFn: async () => {
      const { count } = await supabase.from("employees").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: pendingLeave } = useQuery({
    queryKey: ["pending-leave-count"],
    queryFn: async () => {
      const { count } = await supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count ?? 0;
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["recent-leave"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("id, leave_type, status, start_date, end_date, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const kpis = [
    { label: "Total Headcount", value: employees ?? "—", icon: Users, hint: "Employees in your directory" },
    { label: "Pending Leave", value: pendingLeave ?? "—", icon: CalendarDays, hint: "Requests awaiting review" },
    { label: "Open Roles", value: 0, icon: TrendingUp, hint: "Recruitment coming soon" },
    { label: "Attendance", value: "—", icon: Clock, hint: "Tracking coming soon" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Workforce health and pending administrative tasks.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
              <k.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold">{k.value}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{k.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Recent leave activity</h3>
          {!recentActivity || recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requests yet.</p>
          ) : (
            <ul className="space-y-4">
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <div className={`mt-1.5 size-2 shrink-0 rounded-full ${a.status === "approved" ? "bg-emerald-500" : a.status === "rejected" ? "bg-destructive" : "bg-amber-500"}`} />
                  <div>
                    <p className="font-medium capitalize">{a.leave_type} leave • {a.status}</p>
                    <p className="text-xs text-muted-foreground">{a.start_date} → {a.end_date}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6 text-zinc-100">
          <div className="mb-4 grid size-10 place-items-center rounded-xl border border-zinc-700 bg-zinc-800">
            <div className="size-3 rounded-full bg-emerald-400 blur-[3px]" />
          </div>
          <h4 className="text-sm font-medium">Ask SmartHR AI</h4>
          <p className="mt-1 text-xs text-zinc-400">Draft policies, answer HR questions, and summarize workforce data.</p>
          <Link to="/chat" className="mt-4 block">
            <Button className="w-full bg-zinc-100 text-zinc-900 hover:bg-white">Open AI Assistant</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
