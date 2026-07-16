import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const statusEnum = z.enum([
  "requested",
  "confirmed",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

const createInput = z.object({
  tractorId: z.string().uuid().nullable().optional(),
  dealerId: z.string().uuid().nullable().optional(),
  serialNumber: z.string().optional(),
  serviceType: z.string().min(2),
  scheduledAt: z.string(), // ISO
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const createAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => createInput.parse(v))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("service_appointments")
      .insert({
        customer_id: context.userId,
        tractor_id: data.tractorId ?? null,
        dealer_id: data.dealerId ?? null,
        serial_number: data.serialNumber ?? null,
        service_type: data.serviceType,
        scheduled_at: data.scheduledAt,
        address: data.address ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("service_appointments")
      .select("*, tractor:tractors(brand,model), dealer:dealers(name,city)")
      .order("scheduled_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAppointmentUpdates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ appointmentId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("service_appointment_updates")
      .select("*")
      .eq("appointment_id", data.appointmentId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateAppointmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ appointmentId: z.string().uuid(), status: statusEnum, message: z.string().optional() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("service_appointments")
      .update({ status: data.status })
      .eq("id", data.appointmentId);
    if (error) throw new Error(error.message);
    if (data.message?.trim()) {
      await context.supabase.from("service_appointment_updates").insert({
        appointment_id: data.appointmentId,
        author_id: context.userId,
        status: data.status,
        message: data.message.trim(),
      });
    }
    return { ok: true };
  });

export const postAppointmentMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ appointmentId: z.string().uuid(), message: z.string().min(1) }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("service_appointment_updates").insert({
      appointment_id: data.appointmentId,
      author_id: context.userId,
      message: data.message.trim(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
