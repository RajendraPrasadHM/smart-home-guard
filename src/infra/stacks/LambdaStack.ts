import { Construct, Stack, StackProps, Fn } from '@aws-cdk/core';
import { LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import * as LambdaFunction from "@aws-cdk/aws-lambda";
import { join } from "path";
import { ITable } from "@aws-cdk/aws-dynamodb";
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { UserPool, UserPoolClient } from "@aws-cdk/aws-cognito";
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubscriptions from '@aws-cdk/aws-sns-subscriptions';



interface lambdaStackProps extends StackProps {
    smartHomeTable: ITable;
    smartHomeDeviceTable: ITable;
    smartHomeNotificationTable: ITable;
    smartHomeUserPool: UserPool;
    smartHomeUserClientPool: UserPoolClient;
}



export class LambdaStack extends Stack {

    public readonly smartHomeLambdaIntegration: LambdaIntegration
    public readonly motionDetectionLambdaArn: LambdaFunction.Function
    public readonly lightDetectionLambda: NodejsFunction;


    constructor(scope: Construct, id: string, props: lambdaStackProps) {
        super(scope, id, props)

        // Create SNS Topic
        const topic = new sns.Topic(this, 'MotionDetectionTopic', {
            displayName: 'Motion Detection Topic',
            topicName: 'MotionDetectionTopic',
        });

        const environments = {
            TABLE_NAME: props.smartHomeTable.tableName,
            DEVICE_TABLE_NAME: props.smartHomeDeviceTable.tableName,
            NOTIFICATION_TABLE_NAME: props.smartHomeNotificationTable.tableName,
            USER_POOL_ID: props.smartHomeUserPool.userPoolId,
            CLIENT_ID: props.smartHomeUserClientPool.userPoolClientId,
            IOT_THING_GROUP_NAME: "smartHomeUserThingGroup",
            HOLIDAY_NOTIFICATION_TOPIC_ARN: topic.topicArn
        }

        // Subscribe to the topic
        const smartHomelambda = new NodejsFunction(this, "SmartHomeLambda", {
            runtime: LambdaFunction.Runtime.NODEJS_16_X,
            handler: "handler",
            entry: (join(__dirname, '..', '..', 'services', 'lambdas', 'userLambdas', 'handler.ts')),
            functionName: "SmartHomeLambdaRegister",
            environment: environments
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
            environment: environments
        });

        // Permission to access DynamoDB table
        motionDetectionLambda.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            resources: ["*"],
            actions: ["*"]
        }));
        // Subscribe Lambda function to SNS topic
        topic.addSubscription(new snsSubscriptions.LambdaSubscription(motionDetectionLambda));

        // Allow Lambda function to publish to SNS topic
        topic.grantPublish(motionDetectionLambda);

        this.motionDetectionLambdaArn = motionDetectionLambda;

        // / Motion Detection Lambda
        const lightDetectionLambda = new NodejsFunction(this, "LightDetectionLambda", {
            runtime: LambdaFunction.Runtime.NODEJS_16_X,
            entry: (join(__dirname, '..', '..', 'services', 'lambdas', 'deviceLambdas', 'lightDetectionHandler.ts')),
            handler: 'handler',
            functionName: "LightDetectionLambda",
            environment: environments
        });

        // Grant permissions to the Lambda function to write to DynamoDB
        props.smartHomeTable.grantReadWriteData(lightDetectionLambda);
        props.smartHomeDeviceTable.grantReadWriteData(lightDetectionLambda);


        // Permission to access DynamoDB table
        lightDetectionLambda.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            resources: ["*"],
            actions: ["*"]
        }));

        // Subscribe Lambda function to SNS topic
        topic.addSubscription(new snsSubscriptions.LambdaSubscription(lightDetectionLambda));

        // Allow Lambda function to publish to SNS topic
        topic.grantPublish(lightDetectionLambda);

        this.lightDetectionLambda = lightDetectionLambda;

    }
}