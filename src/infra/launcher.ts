import { App } from "@aws-cdk/core";
import { DataStack } from "./stacks/DataStack";
import { LambdaStack } from "./stacks/LambdaStack";
import { ApiStack } from "./stacks/ApiStack";
import { AuthStack } from "./stacks/AuthStack";
import { IotStack } from "./stacks/IotStack";




const app = new App();
// Data Base changes
const datatStack = new DataStack(app, "DataStack", {});
// Cognito Changes
const authStack = new AuthStack(app, "AuthStack", {});
// Lambda Changes
const lambdaStack = new LambdaStack(app, "LambdaStack", {
    smartHomeTable: datatStack.smartHomeTable,
    smartHomeDeviceTable: datatStack.smartHomeDeviceTable,
    smartHomeUserPool: authStack.userPool,
    smartHomeUserClientPool: authStack.userPoolClient
});
// Iot Changes
new IotStack(app, "IotStack", {
    smartHomeMotionDetectionLambda: lambdaStack.motionDetectionLambdaArn,
    smartHomeTable: datatStack.smartHomeTable,
    smartHomeDeviceTable: datatStack.smartHomeDeviceTable,
    lightDetectionLambda: lambdaStack.lightDetectionLambda,
});

// API Changes
new ApiStack(app, "APIStack", {
    smartHomeLambdaIntegration: lambdaStack.smartHomeLambdaIntegration,
    smartHomeMotionDetectionLambda: lambdaStack.motionDetectionLambdaArn,
    userPool: authStack.userPool
});

