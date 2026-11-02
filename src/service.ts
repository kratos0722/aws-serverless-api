import { randomUUID } from "node:crypto";

import { appointmentInput, type Appointment } from "./domain.js";
import type { AppointmentRepository } from "./repository.js";

export class AppointmentService {
  constructor(private readonly repo: AppointmentRepository) {}

  /** Validate input, assign identity, persist. Throws ZodError on bad input. */
  async create(raw: unknown): Promise<Appointment> {
    const input = appointmentInput.parse(raw);
    const appointment: Appointment = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await this.repo.put(appointment);
    return appointment;
  }

  async get(id: string): Promise<Appointment | null> {
    return this.repo.get(id);
  }

  async listByPatient(patientId: string): Promise<Appointment[]> {
    return this.repo.listByPatient(patientId);
  }

  /** Replace an existing appointment, preserving its id and createdAt. Returns null if it doesn't exist. */
  async update(id: string, raw: unknown): Promise<Appointment | null> {
    const existing = await this.repo.get(id);
    if (!existing) {
      return null;
    }
    const input = appointmentInput.parse(raw);
    const updated: Appointment = { ...input, id: existing.id, createdAt: existing.createdAt };
    await this.repo.put(updated);
    return updated;
  }

  /** Delete an appointment. Returns false if it didn't exist. */
  async remove(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}
