import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, it } from "vitest";

import { ServerlessApiStack } from "../src/stack.js";

function template() {
  const app = new cdk.App();
  const stack = new ServerlessApiStack(app, "TestStack");
  return Template.fromStack(stack);
}

describe("ServerlessApiStack", () => {
  it("provisions an encrypted DynamoDB table with the byPatient GSI", () => {
    const t = template();
    t.resourceCountIs("AWS::DynamoDB::Table", 1);
    t.hasResourceProperties("AWS::DynamoDB::Table", {
      SSESpecification: { SSEEnabled: true },
      GlobalSecondaryIndexes: Match.arrayWith([Match.objectLike({ IndexName: "byPatient" })]),
    });
  });

  it("provisions a Lambda function and an HTTP API", () => {
    const t = template();
    t.resourceCountIs("AWS::Lambda::Function", 1);
    t.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
  });
});
