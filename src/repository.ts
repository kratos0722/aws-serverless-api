import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import type { Appointment } from "./domain.js";

export interface AppointmentRepository {
  put(appointment: Appointment): Promise<void>;
  get(id: string): Promise<Appointment | null>;
  listByPatient(patientId: string): Promise<Appointment[]>;
}

/** In-memory repository for unit tests and local runs. */
export class InMemoryAppointmentRepository implements AppointmentRepository {
  private readonly items = new Map<string, Appointment>();

  async put(appointment: Appointment): Promise<void> {
    this.items.set(appointment.id, appointment);
  }

  async get(id: string): Promise<Appointment | null> {
    return this.items.get(id) ?? null;
  }

  async listByPatient(patientId: string): Promise<Appointment[]> {
    return [...this.items.values()].filter((a) => a.patientId === patientId);
  }
}

/**
 * DynamoDB-backed repository. The table is keyed on `id`; a `byPatient` GSI
 * (partition `patientId`, sort `startsAt`) backs the list query.
 */
export class DynamoAppointmentRepository implements AppointmentRepository {
  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async put(appointment: Appointment): Promise<void> {
    await this.doc.send(new PutCommand({ TableName: this.tableName, Item: appointment }));
  }

  async get(id: string): Promise<Appointment | null> {
    const res = await this.doc.send(new GetCommand({ TableName: this.tableName, Key: { id } }));
    return (res.Item as Appointment | undefined) ?? null;
  }

  async listByPatient(patientId: string): Promise<Appointment[]> {
    const res = await this.doc.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "byPatient",
      KeyConditionExpression: "patientId = :p",
      ExpressionAttributeValues: { ":p": patientId },
    }));
    return (res.Items as Appointment[] | undefined) ?? [];
  }
}
