import { handler } from "../../src/services/lambdas/userLambdas/handler";

handler({
    body: JSON.stringify({
        username: "XXXX",
        password: "XXXX"
    }),
    headers: undefined,
    multiValueHeaders: undefined,
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: "smart-home/register/31121",
    pathParameters: undefined,
    queryStringParameters: undefined,
    multiValueQueryStringParameters: undefined,
    stageVariables: undefined,
    requestContext: undefined,
    resource: ""
}, {
    callbackWaitsForEmptyEventLoop: false,
    functionName: "",
    functionVersion: "",
    invokedFunctionArn: "",
    memoryLimitInMB: "",
    awsRequestId: "",
    logGroupName: "",
    logStreamName: "",
    getRemainingTimeInMillis: function (): number {
        throw new Error("Function not implemented.");
    },
    done: function (error?: Error, result?: any): void {
        throw new Error("Function not implemented.");
    },
    fail: function (error: string | Error): void {
        throw new Error("Function not implemented.");
    },
    succeed: function (messageOrObject: any): void {
        throw new Error("Function not implemented.");
    }
})


