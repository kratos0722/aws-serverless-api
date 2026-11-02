import * as cdk from "aws-cdk-lib";

import { ServerlessApiStack } from "../src/stack.js";

const app = new cdk.App();
new ServerlessApiStack(app, "ServerlessApiStack");
