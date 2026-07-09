import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({ meta: [{ title: "Employees — SmartHR AI" }] }),
  component: Employees,
});

function Employees() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", job_title: "", department: "", phone: "", hire_date: "" });

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submit = async () => {
    if (!form.full_name || !form.email) return toast.error("Name and email are required");
    const { error } = await supabase.from("employees").insert({ ...form, hire_date: form.hire_date || null });
    if (error) return toast.error(error.message);
    toast.success("Employee added");
    setForm({ full_name: "", email: "", job_title: "", department: "", phone: "", hire_date: "" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["employees"] });
    qc.invalidateQueries({ queryKey: ["employees-count"] });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">Your organisation directory.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 size-4" /> Add employee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New employee</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Job title</Label><Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Hire date</Label><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={submit}>Save employee</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Job title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hire date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (<TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>)}
            {!isLoading && (!employees || employees.length === 0) && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No employees yet. Add your first one.</TableCell></TableRow>
            )}
            {employees?.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{e.email}</TableCell>
                <TableCell>{e.job_title || "—"}</TableCell>
                <TableCell>{e.department || "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{e.employment_status}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{e.hire_date || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
