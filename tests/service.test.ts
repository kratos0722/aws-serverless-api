import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { InMemoryAppointmentRepository } from "../src/repository.js";
import { AppointmentService } from "../src/service.js";

function newService() {
  return new AppointmentService(new InMemoryAppointmentRepository());
}

const valid = {
  patientId: "P-1",
  provider: "Dr. Smith",
  startsAt: "2026-02-01T09:00:00Z",
  reason: "checkup",
};

describe("AppointmentService", () => {
  it("creates a valid appointment with id and timestamp", async () => {
    const appt = await newService().create(valid);
    expect(appt.id).toMatch(/[0-9a-f-]{36}/);
    expect(appt.patientId).toBe("P-1");
    expect(appt.createdAt).toBeTruthy();
  });

  it("rejects invalid input", async () => {
    await expect(newService().create({ provider: "x" })).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a non-ISO startsAt", async () => {
    await expect(newService().create({ ...valid, startsAt: "soon" })).rejects.toBeInstanceOf(ZodError);
  });

  it("gets and lists by patient", async () => {
    const svc = newService();
    const a = await svc.create(valid);
    await svc.create({ ...valid, patientId: "P-2" });

    expect((await svc.get(a.id))?.id).toBe(a.id);
    expect(await svc.get("missing")).toBeNull();
    const forP1 = await svc.listByPatient("P-1");
    expect(forP1).toHaveLength(1);
    expect(forP1[0].patientId).toBe("P-1");
  });

  it("updates an existing appointment, preserving id and createdAt", async () => {
    const svc = newService();
    const a = await svc.create(valid);
    const updated = await svc.update(a.id, { ...valid, provider: "Dr. Jones" });
    expect(updated?.id).toBe(a.id);
    expect(updated?.createdAt).toBe(a.createdAt);
    expect(updated?.provider).toBe("Dr. Jones");
    expect((await svc.get(a.id))?.provider).toBe("Dr. Jones");
  });

  it("returns null when updating a missing appointment", async () => {
    expect(await newService().update("missing", valid)).toBeNull();
  });

  it("rejects invalid update input", async () => {
    const svc = newService();
    const a = await svc.create(valid);
    await expect(svc.update(a.id, { provider: "x" })).rejects.toBeInstanceOf(ZodError);
  });

  it("deletes an appointment and reports existence", async () => {
    const svc = newService();
    const a = await svc.create(valid);
    expect(await svc.remove(a.id)).toBe(true);
    expect(await svc.get(a.id)).toBeNull();
    expect(await svc.remove(a.id)).toBe(false);
  });
});
