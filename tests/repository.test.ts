import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it } from "vitest";

import type { Appointment } from "../src/domain.js";
import { DynamoAppointmentRepository } from "../src/repository.js";

const ddbMock = mockClient(DynamoDBDocumentClient);

function repo() {
  return new DynamoAppointmentRepository(
    DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" })),
    "Appointments",
  );
}

const sample: Appointment = {
  id: "a1",
  patientId: "P-1",
  provider: "Dr. Smith",
  startsAt: "2026-02-01T09:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
};

describe("DynamoAppointmentRepository", () => {
  beforeEach(() => ddbMock.reset());

  it("put sends a PutCommand with the item", async () => {
    ddbMock.on(PutCommand).resolves({});
    await repo().put(sample);
    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input.Item).toEqual(sample);
  });

  it("get returns the item or null", async () => {
    ddbMock.on(GetCommand).resolves({ Item: sample });
    expect(await repo().get("a1")).toEqual(sample);

    ddbMock.on(GetCommand).resolves({});
    expect(await repo().get("missing")).toBeNull();
  });

  it("listByPatient queries the GSI", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [sample] });
    const result = await repo().listByPatient("P-1");
    expect(result).toEqual([sample]);
    expect(ddbMock.commandCalls(QueryCommand)[0].args[0].input.IndexName).toBe("byPatient");
  });
});
