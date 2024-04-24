import { type DynamoDB } from "@aws-sdk/client-dynamodb";
import { handler } from "../src/services/lambdas/deviceLambdas/motionDetectionHandler";
import { DeviceLambda } from "../src/services/lambdas/userLambdas/DeviceLambda";

console.log(process.env);

const deviceLambda = new DeviceLambda();

// handler({
//     userId: "123",
//     motionSensorId: "221",
//     motionDetected: true
// });

// deviceLambda.registerDevice({
//     httpMethod: 'POST',
//     body: "",
//     headers: undefined,
//     multiValueHeaders: undefined,
//     isBase64Encoded: false,
//     path: "",
//     pathParameters: undefined,
//     queryStringParameters: undefined,
//     multiValueQueryStringParameters: undefined,
//     stageVariables: undefined,
//     requestContext: undefined,
//     resource: ""
// }, {
//     callbackWaitsForEmptyEventLoop: false,
//     functionName: "",
//     functionVersion: "",
//     invokedFunctionArn: "",
//     memoryLimitInMB: "",
//     awsRequestId: "",
//     logGroupName: "",
//     logStreamName: "",
//     getRemainingTimeInMillis: function (): number {
//         throw new Error("Function not implemented.");
//     },
//     done: function (error?: Error, result?: any): void {
//         throw new Error("Function not implemented.");
//     },
//     fail: function (error: string | Error): void {
//         throw new Error("Function not implemented.");
//     },
//     succeed: function (messageOrObject: any): void {
//         throw new Error("Function not implemented.");
//     }
// }, DynamoDB);


