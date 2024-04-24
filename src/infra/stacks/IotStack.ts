import { Construct, Stack, StackProps } from '@aws-cdk/core';
import * as iot from '@aws-cdk/aws-iot';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { ITable } from '@aws-cdk/aws-dynamodb';
import { LogGroup } from '@aws-cdk/aws-logs';
import * as iam from '@aws-cdk/aws-iam';
import * as LambdaFunction from "@aws-cdk/aws-lambda";
import { AccessLogFormat, AuthorizationType, CognitoUserPoolsAuthorizer, LambdaIntegration, LogGroupLogDestination, RestApi } from '@aws-cdk/aws-apigateway';


interface IotStackProps extends StackProps {
    smartHomeMotionDetectionLambda: LambdaFunction.Function;
    smartHomeTable: ITable;
    smartHomeDeviceTable: ITable
}


export class IotStack extends Stack {
    public readonly smartHomeThingGroup: iot.CfnThingGroup;

    constructor(scope: Construct, id: string, props?: IotStackProps) {
        super(scope, id, props)
        // Create a smartHomeUserThingGroup in iot thing group
        const smartHomeUserThingGroup = new iot.CfnThingGroup(this, 'smartHomeUserThingGroup', {
            thingGroupName: 'smartHomeUserThingGroup',
            thingGroupProperties: {
                thingGroupDescription: 'Smart Home User Thing Group',
            },
        });
        // Create a policy for the IoT Thing Group
        new iot.CfnPolicy(this, 'ThingGroupPolicy', {
            policyName: 'ThingGroupPolicy',
            policyDocument: {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "iot:*",
                            "iot:Receive",
                            "iot:Publish"
                        ],
                        "Resource": "*"
                    }
                ]
            }
        });

        // Create a rule to trigger when motion is detected
        const motionRule = new iot.CfnTopicRule(this, 'MotionRule', {
            ruleName: 'MotionRule',
            topicRulePayload: {
                actions: [
                    {
                        lambda: {
                            functionArn: props?.smartHomeMotionDetectionLambda.functionArn
                        }
                    }
                ],
                ruleDisabled: false,
                sql: "SELECT * FROM 'home/user/light/control'"
            }
        });

        this.smartHomeThingGroup = smartHomeUserThingGroup;
    }
}