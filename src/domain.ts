import { z } from "zod";

/** Validated appointment input (the API's request contract). */
export const appointmentInput = z.object({
  patientId: z.string().min(1).max(128),
  provider: z.string().min(1).max(128),
  startsAt: z.string().datetime(), // ISO-8601
  reason: z.string().max(500).optional(),
});

export type AppointmentInput = z.infer<typeof appointmentInput>;

export interface Appointment extends AppointmentInput {
  id: string;
  createdAt: string;
}
