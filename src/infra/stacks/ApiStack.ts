import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { LogGroup } from '@aws-cdk/aws-logs';
import { AccessLogFormat, AuthorizationType, CognitoUserPoolsAuthorizer, LambdaIntegration, LogGroupLogDestination, RestApi } from '@aws-cdk/aws-apigateway';
import { Api_Constants as APICONSTANTS } from '../../constants/apiConstants';
import { IUserPool } from '@aws-cdk/aws-cognito';
import * as LambdaFunction from "@aws-cdk/aws-lambda";


interface ApiStackProps extends StackProps {
    smartHomeLambdaIntegration: LambdaIntegration;
    smartHomeMotionDetectionLambda: LambdaFunction.Function;
    userPool: IUserPool
}

export class ApiStack extends Stack {
    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        const api = new RestApi(this, 'SmartHomeApi',
            {
                restApiName: 'SmartHomeApi',
                description: 'Smart Home API'
            }
        );

        const authorizer = new CognitoUserPoolsAuthorizer(this, 'SmartHomeAuthorizer', {
            cognitoUserPools: [props.userPool],
            identitySource: 'method.request.header.Authorization',

        });
        authorizer._attachToApi(api);
        const optionsWithAuth = {
            authorizationType: AuthorizationType.COGNITO,
            authorizer: { authorizerId: authorizer.authorizerId }
        }


        const smartHomeResource = api.root.addResource(APICONSTANTS.SMARTHOMEAPI);

        smartHomeResource
            .addResource(APICONSTANTS.REGISTER)
            .addMethod(APICONSTANTS.METHOD.POST, props.smartHomeLambdaIntegration);

        smartHomeResource
            .addResource(APICONSTANTS.VERIFY)
            .addMethod(APICONSTANTS.METHOD.POST, props.smartHomeLambdaIntegration);

        smartHomeResource
            .addResource(APICONSTANTS.LOGIN)
            .addMethod(APICONSTANTS.METHOD.POST, props.smartHomeLambdaIntegration);

        smartHomeResource
            .addMethod(APICONSTANTS.METHOD.GET, props.smartHomeLambdaIntegration, optionsWithAuth);

        smartHomeResource
            .addMethod(APICONSTANTS.METHOD.PATCH, props.smartHomeLambdaIntegration, optionsWithAuth);

        smartHomeResource
            .addResource(APICONSTANTS.ID)
            .addMethod(APICONSTANTS.METHOD.DELETE, props.smartHomeLambdaIntegration, optionsWithAuth);

        const deviceApi = smartHomeResource
            .addResource(APICONSTANTS.DEVICES);

        deviceApi.addMethod(APICONSTANTS.METHOD.GET, props.smartHomeLambdaIntegration, optionsWithAuth);

        deviceApi.addResource(APICONSTANTS.REGISTER)
            .addMethod(APICONSTANTS.METHOD.POST, props.smartHomeLambdaIntegration, optionsWithAuth);

        const deviceApiWithId = deviceApi.addResource(APICONSTANTS.ID)
        deviceApiWithId.addMethod(APICONSTANTS.METHOD.POST, new LambdaIntegration(props.smartHomeMotionDetectionLambda), optionsWithAuth)
        deviceApiWithId.addMethod(APICONSTANTS.METHOD.GET, props.smartHomeLambdaIntegration, optionsWithAuth);
        deviceApiWithId.addMethod(APICONSTANTS.METHOD.PATCH, props.smartHomeLambdaIntegration, optionsWithAuth);
        deviceApiWithId.addMethod(APICONSTANTS.METHOD.DELETE, props.smartHomeLambdaIntegration, optionsWithAuth);
    }
}
