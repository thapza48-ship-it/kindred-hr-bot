import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leave")({
  head: () => ({ meta: [{ title: "Leave — SmartHR AI" }] }),
  component: Leave,
});

const daysBetween = (a: string, b: string) => {
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  return Math.max(1, Math.round(d) + 1);
};

function Leave() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leave_type: "annual", start_date: "", end_date: "", reason: "" });

  const { data: canReview } = useQuery({
    queryKey: ["can-review-leave"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return !!data?.some((r) => r.role === "hr_manager" || r.role === "executive");
    },
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submit = async () => {
    if (!form.start_date || !form.end_date) return toast.error("Pick start and end dates");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const days = daysBetween(form.start_date, form.end_date);
    const { error } = await supabase.from("leave_requests").insert({
      user_id: u.user.id,
      leave_type: form.leave_type as "annual" | "sick" | "family" | "study" | "unpaid" | "other",
      start_date: form.start_date,
      end_date: form.end_date,
      days,
      reason: form.reason || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Leave request submitted");
    setForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["leave-requests"] });
    qc.invalidateQueries({ queryKey: ["pending-leave-count"] });
  };

  const review = async (id: string, status: "approved" | "rejected") => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("leave_requests").update({
      status,
      reviewer_id: u.user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Request ${status}`);
    qc.invalidateQueries({ queryKey: ["leave-requests"] });
    qc.invalidateQueries({ queryKey: ["pending-leave-count"] });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leave</h1>
          <p className="text-sm text-muted-foreground">Apply for time off and track approvals.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 size-4" /> Request leave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New leave request</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Leave type</Label>
                <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="family">Family responsibility</SelectItem>
                    <SelectItem value="study">Study</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Start</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div className="grid gap-2"><Label>End</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div className="grid gap-2"><Label>Reason (optional)</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Submit request</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              {canReview && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (<TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>)}
            {!isLoading && (!requests || requests.length === 0) && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No leave requests yet.</TableCell></TableRow>
            )}
            {requests?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="capitalize font-medium">{r.leave_type}</TableCell>
                <TableCell className="text-muted-foreground">{r.start_date} → {r.end_date}</TableCell>
                <TableCell>{r.days}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{r.reason || "—"}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="capitalize">
                    {r.status}
                  </Badge>
                </TableCell>
                {canReview && (
                  <TableCell className="text-right">
                    {r.status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => review(r.id, "approved")} aria-label="Approve"><Check className="size-4 text-emerald-600" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => review(r.id, "rejected")} aria-label="Reject"><X className="size-4 text-destructive" /></Button>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
