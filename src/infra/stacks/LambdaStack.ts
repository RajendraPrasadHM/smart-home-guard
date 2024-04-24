import { Construct, Stack, StackProps, Fn } from '@aws-cdk/core';
import { LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import * as LambdaFunction from "@aws-cdk/aws-lambda";
import { join } from "path";
import { ITable } from "@aws-cdk/aws-dynamodb";
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { UserPool, UserPoolClient } from "@aws-cdk/aws-cognito";


interface lambdaStackProps extends StackProps {
    smartHomeTable: ITable;
    smartHomeDeviceTable: ITable;
    smartHomeUserPool: UserPool;
    smartHomeUserClientPool: UserPoolClient;
}



export class LambdaStack extends Stack {

    public readonly smartHomeLambdaIntegration: LambdaIntegration
    public readonly motionDetectionLambdaArn: LambdaFunction.Function


    constructor(scope: Construct, id: string, props: lambdaStackProps) {
        super(scope, id, props)

        const smartHomelambda = new NodejsFunction(this, "SmartHomeLambda", {
            runtime: LambdaFunction.Runtime.NODEJS_16_X,
            handler: "handler",
            entry: (join(__dirname, '..', '..', 'services', 'lambdas', 'userLambdas', 'handler.ts')),
            functionName: "SmartHomeLambdaRegister",
            environment: {
                TABLE_NAME: props.smartHomeTable.tableName,
                USER_POOL_ID: props.smartHomeUserPool.userPoolId,
                CLIENT_ID: props.smartHomeUserClientPool.userPoolClientId,
                DEVICE_TABLE_NAME: props.smartHomeDeviceTable.tableName,
                IOT_THING_GROUP_NAME: "smartHomeUserThingGroup"
            },
        });

        smartHomelambda.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            resources: ["*"],
            actions: ["*", "iot:AddThingToThingGroup"]
        }));


        this.smartHomeLambdaIntegration = new LambdaIntegration(smartHomelambda);


        // / Motion Detection Lambda
        const motionDetectionLambda = new NodejsFunction(this, "MotionDetectionLambda", {
            runtime: LambdaFunction.Runtime.NODEJS_16_X,
            entry: (join(__dirname, '..', '..', 'services', 'lambdas', 'deviceLambdas', 'motionDetectionHandler.ts')),
            handler: 'handler',
            functionName: "MotionDetectionLambda",
            environment: {
                TABLE_NAME: props.smartHomeTable.tableName,
                DEVICE_TABLE_NAME: props.smartHomeDeviceTable.tableName,
                USER_POOL_ID: props.smartHomeUserPool.userPoolId,
                CLIENT_ID: props.smartHomeUserClientPool.userPoolClientId
            }
        });

        // Permission to access DynamoDB table
        motionDetectionLambda.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [props.smartHomeTable.tableArn, props.smartHomeDeviceTable.tableArn],
            actions: ["dynamodb:*", "logs:*"]
        }));

        this.motionDetectionLambdaArn = motionDetectionLambda;

    }
}