import * as path from "node:path";
import { fileURLToPath } from "node:url";

import * as cdk from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type { Construct } from "constructs";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Serverless appointments API: DynamoDB + Lambda + HTTP API, least-privilege. */
export class ServerlessApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "Appointments", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED, // encryption at rest (HIPAA)
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    table.addGlobalSecondaryIndex({
      indexName: "byPatient",
      partitionKey: { name: "patientId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "startsAt", type: dynamodb.AttributeType.STRING },
    });

    const fn = new NodejsFunction(this, "AppointmentsFn", {
      entry: path.join(here, "handlers", "appointments.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: { TABLE_NAME: table.tableName },
    });
    // Least privilege: the function gets exactly read/write on this table.
    table.grantReadWriteData(fn);

    const api = new HttpApi(this, "AppointmentsApi");
    const integration = new HttpLambdaIntegration("AppointmentsIntegration", fn);
    api.addRoutes({ path: "/appointments", methods: [HttpMethod.POST, HttpMethod.GET], integration });
    api.addRoutes({
      path: "/appointments/{id}",
      methods: [HttpMethod.GET, HttpMethod.PUT, HttpMethod.DELETE],
      integration,
    });

    new cdk.CfnOutput(this, "ApiUrl", { value: api.apiEndpoint });
  }
}
