import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import {
  createAppointment,
  listMyAppointments,
  listAppointmentUpdates,
  updateAppointmentStatus,
  postAppointmentMessage,
} from "@/lib/appointments.functions";
import { listTractors, listDealers } from "@/lib/catalog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarClock, Plus, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/appointments")({
  head: () => ({ meta: [{ title: "Service appointments · Escorts Kubota AI" }] }),
  component: AppointmentsPage,
});

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-muted text-foreground",
  confirmed: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  scheduled: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/15 text-destructive",
};

const STATUS_OPTIONS = [
  "requested",
  "confirmed",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

function AppointmentsPage() {
  const { roles } = useAuth();
  const role: AppRole = roles.includes("admin")
    ? "admin"
    : roles.includes("dealer")
    ? "dealer"
    : roles.includes("service_engineer")
    ? "service_engineer"
    : "customer";
  const isStaff = role !== "customer";

  const qc = useQueryClient();
  const list = useServerFn(listMyAppointments);
  const { data: appts = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => list(),
  });

  // Realtime refresh on changes
  useEffect(() => {
    const ch = supabase
      .channel("appointments-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_appointments" },
        () => qc.invalidateQueries({ queryKey: ["appointments"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_appointment_updates" },
        () => {
          qc.invalidateQueries({ queryKey: ["appointment-updates"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <DashboardShell role={role}>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Service appointments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isStaff
              ? "Manage upcoming visits and push status updates to customers."
              : "Book a maintenance visit and follow live status updates from your engineer."}
          </p>
        </div>
        {!isStaff && <NewAppointmentDialog />}
      </header>

      {isLoading ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading appointments…
        </div>
      ) : appts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No appointments yet.</p>
          {!isStaff && (
            <div className="mt-4">
              <NewAppointmentDialog />
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Scheduled</th>
                <th className="px-4 py-2">Tractor</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {appts.map((a: any) => (
                <tr
                  key={a.id}
                  className="cursor-pointer border-t border-border hover:bg-muted/30"
                  onClick={() => setSelectedId(a.id)}
                >
                  <td className="px-4 py-3 font-medium">{a.service_type}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(a.scheduled_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.tractor ? `${a.tractor.brand} ${a.tractor.model}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_STYLE[a.status] ?? ""} variant="secondary">
                      {a.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-primary">Open →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AppointmentDrawer
        appointmentId={selectedId}
        onClose={() => setSelectedId(null)}
        appt={appts.find((a: any) => a.id === selectedId) ?? null}
        isStaff={isStaff}
      />
    </DashboardShell>
  );
}

function NewAppointmentDialog() {
  const qc = useQueryClient();
  const listT = useServerFn(listTractors);
  const listD = useServerFn(listDealers);
  const create = useServerFn(createAppointment);
  const { data: tractors = [] } = useQuery({ queryKey: ["tractors"], queryFn: () => listT() });
  const { data: dealers = [] } = useQuery({ queryKey: ["dealers"], queryFn: () => listD() });

  const [open, setOpen] = useState(false);
  const [serviceType, setServiceType] = useState("Routine service");
  const [scheduledAt, setScheduledAt] = useState("");
  const [tractorId, setTractorId] = useState<string>("");
  const [dealerId, setDealerId] = useState<string>("");
  const [serial, setSerial] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      create({
        data: {
          serviceType,
          scheduledAt: new Date(scheduledAt).toISOString(),
          tractorId: tractorId || null,
          dealerId: dealerId || null,
          serialNumber: serial || undefined,
          address: address || undefined,
          notes: notes || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Appointment requested. You'll get status updates here.");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      setOpen(false);
      setScheduledAt("");
      setNotes("");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not book appointment"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Book service
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book a service appointment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Service type</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Routine service","Oil & filter change","Engine diagnostics","Hydraulics check","Warranty inspection","On-site repair"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Preferred date & time</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tractor</Label>
              <Select value={tractorId} onValueChange={setTractorId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {tractors.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.brand} {t.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Preferred dealer</Label>
              <Select value={dealerId} onValueChange={setDealerId}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  {dealers.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} — {d.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Serial number (optional)</Label>
            <Input value={serial} onChange={(e) => setSerial(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Service address (optional)</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Village, district, state" />
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe the issue or reason for visit…" />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!scheduledAt || !serviceType || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? "Booking…" : "Request appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentDrawer({
  appointmentId,
  onClose,
  appt,
  isStaff,
}: {
  appointmentId: string | null;
  onClose: () => void;
  appt: any;
  isStaff: boolean;
}) {
  const qc = useQueryClient();
  const listUpdates = useServerFn(listAppointmentUpdates);
  const updateStatus = useServerFn(updateAppointmentStatus);
  const postMsg = useServerFn(postAppointmentMessage);

  const { data: updates = [] } = useQuery({
    queryKey: ["appointment-updates", appointmentId],
    queryFn: () => listUpdates({ data: { appointmentId: appointmentId! } }),
    enabled: !!appointmentId,
  });

  const [msg, setMsg] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string>("");

  useMemo(() => {
    if (appt) setPendingStatus(appt.status);
  }, [appt?.id, appt?.status]);

  const statusMut = useMutation({
    mutationFn: (status: string) =>
      updateStatus({ data: { appointmentId: appointmentId!, status: status as any } }),
    onSuccess: () => {
      toast.success("Status updated — customer notified.");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment-updates", appointmentId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  const msgMut = useMutation({
    mutationFn: () => postMsg({ data: { appointmentId: appointmentId!, message: msg } }),
    onSuccess: () => {
      setMsg("");
      qc.invalidateQueries({ queryKey: ["appointment-updates", appointmentId] });
    },
  });

  return (
    <Sheet open={!!appointmentId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{appt?.service_type ?? "Appointment"}</SheetTitle>
        </SheetHeader>
        {appt && (
          <div className="mt-4 space-y-4 text-sm">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div><span className="text-muted-foreground">Scheduled:</span> {new Date(appt.scheduled_at).toLocaleString()}</div>
              {appt.tractor && <div><span className="text-muted-foreground">Tractor:</span> {appt.tractor.brand} {appt.tractor.model}</div>}
              {appt.dealer && <div><span className="text-muted-foreground">Dealer:</span> {appt.dealer.name}, {appt.dealer.city}</div>}
              {appt.serial_number && <div><span className="text-muted-foreground">Serial:</span> {appt.serial_number}</div>}
              {appt.address && <div><span className="text-muted-foreground">Address:</span> {appt.address}</div>}
              {appt.notes && <div className="mt-2 text-muted-foreground">{appt.notes}</div>}
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Status</Label>
              {isStaff ? (
                <div className="mt-1 flex gap-2">
                  <Select value={pendingStatus} onValueChange={setPendingStatus}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={pendingStatus === appt.status || statusMut.isPending}
                    onClick={() => statusMut.mutate(pendingStatus)}
                  >
                    Update
                  </Button>
                </div>
              ) : (
                <div className="mt-1">
                  <Badge className={STATUS_STYLE[appt.status] ?? ""} variant="secondary">
                    {appt.status.replace("_", " ")}
                  </Badge>
                  {appt.status !== "cancelled" && appt.status !== "completed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 text-destructive"
                      onClick={() => statusMut.mutate("cancelled")}
                    >
                      Cancel appointment
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Status updates</div>
              <div className="space-y-2">
                {updates.map((u: any) => (
                  <div key={u.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      {u.status ? (
                        <Badge className={STATUS_STYLE[u.status] ?? ""} variant="secondary">
                          {u.status.replace("_", " ")}
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">Message</span>}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(u.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">{u.message}</div>
                  </div>
                ))}
                {updates.length === 0 && (
                  <div className="text-xs text-muted-foreground">No updates yet.</div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Post a message</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Reply or add a note…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && msg.trim()) msgMut.mutate();
                  }}
                />
                <Button
                  size="icon"
                  disabled={!msg.trim() || msgMut.isPending}
                  onClick={() => msgMut.mutate()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
