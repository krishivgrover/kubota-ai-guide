import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/roles";
import {
  listTickets,
  createTicket,
  getTicket,
  addTicketMessage,
  updateTicketStatus,
  assignTicket,
  listStaff,
} from "@/lib/tickets.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import { MessageSquare, Plus, Loader2, Sparkles, User, Wrench, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/complaints")({
  head: () => ({ meta: [{ title: "Complaints · Escorts Kubota AI" }] }),
  component: ComplaintsPage,
});

const CATEGORIES = ["engine", "hydraulics", "electrical", "transmission", "body", "implement", "other"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;
const STATUSES = ["open", "triaged", "assigned", "in_progress", "resolved", "closed"] as const;

function ComplaintsPage() {
  const { roles, user } = useAuth();
  const priority: AppRole[] = ["admin", "service_engineer", "dealer", "customer"];
  const role = priority.find((p) => roles.includes(p)) ?? "customer";
  const isStaff = roles.some((r) => r === "admin" || r === "dealer" || r === "service_engineer");

  return (
    <DashboardShell role={role}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Complaints & Service Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-triaged tickets with routing to dealers and service engineers.
          </p>
        </div>
        <NewTicketDialog />
      </div>
      <TicketList currentUserId={user?.id} isStaff={isStaff} />
    </DashboardShell>
  );
}

function priorityColor(p: string) {
  return p === "critical" ? "destructive" : p === "high" ? "destructive" : p === "low" ? "secondary" : "default";
}
function statusColor(s: string) {
  return s === "resolved" || s === "closed" ? "secondary" : s === "in_progress" || s === "assigned" ? "default" : "outline";
}

function NewTicketDialog() {
  const qc = useQueryClient();
  const createFn = useServerFn(createTicket);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    model: "",
    serial_no: "",
    location: "",
    category: "" as string,
    priority: "" as string,
  });

  const submit = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title: form.title,
          description: form.description,
          model: form.model || undefined,
          serial_no: form.serial_no || undefined,
          location: form.location || undefined,
          category: form.category ? (form.category as any) : undefined,
          priority: form.priority ? (form.priority as any) : undefined,
        },
      }),
    onSuccess: (row) => {
      toast.success(`Ticket ${row.ticket_no} created — AI triage applied`);
      qc.invalidateQueries({ queryKey: ["tickets"] });
      setOpen(false);
      setForm({ title: "", description: "", model: "", serial_no: "", location: "", category: "", priority: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Register a service complaint</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title.trim() || form.description.trim().length < 10) {
              toast.error("Add a title and at least 10 characters of description");
              return;
            }
            submit.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Tractor overheating after 30 min run" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Description <span className="text-primary">(AI will auto-classify category and priority)</span>
            </label>
            <Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Symptoms, when it started, what you've already tried…" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Model</label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Farmtrac 60" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Serial no.</label>
              <Input value={form.serial_no} onChange={(e) => setForm({ ...form, serial_no: e.target.value })} placeholder="EK123456" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Pune, MH" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Category (optional)</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Let AI decide" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Priority (optional)</label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue placeholder="Let AI decide" /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={submit.isPending}>
            {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Submit & triage
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TicketList({ currentUserId, isStaff }: { currentUserId?: string; isStaff: boolean }) {
  const listFn = useServerFn(listTickets);
  const { data, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => listFn(),
    refetchInterval: 15000,
  });
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading tickets…</div>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No tickets yet. Create one to see AI triage in action.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Ticket</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Assigned</th>
              <th className="px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t: any) => (
              <tr key={t.id} className="cursor-pointer border-t border-border transition hover:bg-muted/40" onClick={() => setOpenId(t.id)}>
                <td className="px-4 py-3 font-mono text-xs">{t.ticket_no}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{t.title}</div>
                  {t.ai_summary && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{t.ai_summary}</div>}
                </td>
                <td className="px-4 py-3"><Badge variant="outline">{t.category}</Badge></td>
                <td className="px-4 py-3"><Badge variant={priorityColor(t.priority) as any}>{t.priority}</Badge></td>
                <td className="px-4 py-3"><Badge variant={statusColor(t.status) as any}>{t.status.replace("_", " ")}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{t.engineer_id ? <Wrench className="inline h-3 w-3" /> : "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TicketDrawer id={openId} onClose={() => setOpenId(null)} currentUserId={currentUserId} isStaff={isStaff} />
    </>
  );
}

function TicketDrawer({
  id, onClose, currentUserId, isStaff,
}: { id: string | null; onClose: () => void; currentUserId?: string; isStaff: boolean }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getTicket);
  const addMsgFn = useServerFn(addTicketMessage);
  const statusFn = useServerFn(updateTicketStatus);
  const assignFn = useServerFn(assignTicket);
  const staffFn = useServerFn(listStaff);

  const { data, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => getFn({ data: { id: id! } }),
    enabled: !!id,
    refetchInterval: 8000,
  });
  const { data: staff } = useQuery({
    queryKey: ["staff"],
    queryFn: () => staffFn(),
    enabled: !!id && isStaff,
  });

  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);

  const send = useMutation({
    mutationFn: () => addMsgFn({ data: { ticket_id: id!, body: reply.trim(), is_internal: internal } }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["ticket", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: (status: string) => statusFn({ data: { id: id!, status: status as any } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: (engineer_id: string | null) => assignFn({ data: { id: id!, engineer_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Assignment updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const t = data?.ticket;
  const messages = data?.messages ?? [];
  const profiles = data?.profiles ?? {};

  return (
    <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {isLoading || !t ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{t.ticket_no}</span>
                <Badge variant={priorityColor(t.priority) as any}>{t.priority}</Badge>
                <Badge variant="outline">{t.category}</Badge>
                <Badge variant={statusColor(t.status) as any}>{t.status.replace("_", " ")}</Badge>
              </div>
              <h2 className="mt-2 font-display text-xl font-semibold">{t.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{t.description}</p>
              {t.ai_summary && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 text-primary" />
                  <div><span className="font-medium">AI triage:</span> {t.ai_summary}</div>
                </div>
              )}
              <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                {t.model && <div><span className="font-medium">Model:</span> {t.model}</div>}
                {t.serial_no && <div><span className="font-medium">Serial:</span> {t.serial_no}</div>}
                {t.location && <div><span className="font-medium">Location:</span> {t.location}</div>}
              </div>
            </div>

            {isStaff && (
              <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={t.status} onValueChange={(v) => setStatus.mutate(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Assign to engineer</label>
                  <Select value={t.engineer_id ?? "unassigned"} onValueChange={(v) => assign.mutate(v === "unassigned" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {(staff ?? []).map((s: any) => (
                        <SelectItem key={s.user_id} value={s.user_id}>{s.full_name} ({s.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Conversation</h3>
              <div className="space-y-3">
                {messages.length === 0 && <div className="text-xs text-muted-foreground">No messages yet.</div>}
                {messages.map((m: any) => {
                  const mine = m.sender_id === currentUserId;
                  const name = (profiles as any)[m.sender_id]?.full_name ?? "User";
                  return (
                    <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : m.is_internal ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100" : "bg-muted"}`}>
                        <div className="mb-0.5 flex items-center gap-2 text-[10px] opacity-80">
                          <span>{name}</span>
                          {m.is_internal && <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> internal</span>}
                          <span>· {new Date(m.created_at).toLocaleString()}</span>
                        </div>
                        <div className="whitespace-pre-wrap">{m.body}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!reply.trim()) return;
                  send.mutate();
                }}
                className="mt-4 space-y-2"
              >
                <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" />
                <div className="flex items-center justify-between">
                  {isStaff ? (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                      Internal note (hidden from customer)
                    </label>
                  ) : <span />}
                  <Button type="submit" size="sm" disabled={send.isPending || !reply.trim()}>
                    {send.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
