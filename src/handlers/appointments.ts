import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ZodError } from "zod";

import { DynamoAppointmentRepository } from "../repository.js";
import { AppointmentService } from "../service.js";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const service = new AppointmentService(
  new DynamoAppointmentRepository(doc, process.env.TABLE_NAME ?? ""),
);

function json(statusCode: number, body: unknown) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const id = event.pathParameters?.id;

  try {
    if (method === "POST") {
      const body = event.body ? JSON.parse(event.body) : {};
      return json(201, await service.create(body));
    }
    if (method === "GET" && id) {
      const appointment = await service.get(id);
      return appointment ? json(200, appointment) : json(404, { message: "appointment not found" });
    }
    if (method === "GET") {
      const patientId = event.queryStringParameters?.patientId;
      if (!patientId) {
        return json(400, { message: "patientId query parameter is required" });
      }
      return json(200, await service.listByPatient(patientId));
    }
    if (method === "PUT" && id) {
      const body = event.body ? JSON.parse(event.body) : {};
      const updated = await service.update(id, body);
      return updated ? json(200, updated) : json(404, { message: "appointment not found" });
    }
    if (method === "DELETE" && id) {
      const existed = await service.remove(id);
      return existed ? json(204, null) : json(404, { message: "appointment not found" });
    }
    return json(405, { message: "method not allowed" });
  } catch (error) {
    if (error instanceof ZodError) {
      return json(400, { message: "validation failed", issues: error.issues });
    }
    return json(500, { message: "internal error" });
  }
};
