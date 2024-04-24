import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { CognitoIdentityServiceProvider, DynamoDB } from 'aws-sdk';

import { Api_Constants as API_CONSTANTS } from "../../../constants/apiConstants";
import { UserLambda } from "./UserLambda";
import { DeviceLambda } from "./DeviceLambda";




const userLambda = new UserLambda();
const deviceLambda = new DeviceLambda();

interface Route {
    path: string,
    method: string,
    handler: (event: APIGatewayProxyEvent, context?: Context, dynamoDBClient?: DynamoDB, cognitoClient?: CognitoIdentityServiceProvider) => Promise<APIGatewayProxyResult>
};
const cognitoClient = new CognitoIdentityServiceProvider();
const dynamoDBClient = new DynamoDB();
const routes: Route[] = [
    { path: `/${API_CONSTANTS.SMARTHOMEAPI}/${API_CONSTANTS.LOGIN}`, method: API_CONSTANTS.METHOD.POST, handler: userLambda.loginUser },
    { path: `/${API_CONSTANTS.SMARTHOMEAPI}/${API_CONSTANTS.REGISTER}`, method: API_CONSTANTS.METHOD.POST, handler: userLambda.registerUser },
    { path: `/${API_CONSTANTS.SMARTHOMEAPI}/${API_CONSTANTS.VERIFY}`, method: API_CONSTANTS.METHOD.POST, handler: userLambda.verifyUser },
    { path: `/${API_CONSTANTS.SMARTHOMEAPI}`, method: API_CONSTANTS.METHOD.GET, handler: userLambda.getUser },
    { path: `/${API_CONSTANTS.SMARTHOMEAPI}`, method: API_CONSTANTS.METHOD.PATCH, handler: userLambda.updateUser },
    { path: `/${API_CONSTANTS.SMARTHOMEAPI}/${API_CONSTANTS.DEVICES}/${API_CONSTANTS.REGISTER}`, method: API_CONSTANTS.METHOD.POST, handler: deviceLambda.registerDevice },
    { path: `/${API_CONSTANTS.SMARTHOMEAPI}/${API_CONSTANTS.DEVICES}/${API_CONSTANTS.ID}`, method: API_CONSTANTS.METHOD.GET, handler: deviceLambda.getDevice },
    { path: `/${API_CONSTANTS.SMARTHOMEAPI}/${API_CONSTANTS.DEVICES}/${API_CONSTANTS.ID}`, method: API_CONSTANTS.METHOD.PATCH, handler: deviceLambda.updateDevice },
    { path: `/${API_CONSTANTS.SMARTHOMEAPI}/${API_CONSTANTS.DEVICES}/${API_CONSTANTS.ID}`, method: API_CONSTANTS.METHOD.DELETE, handler: deviceLambda.deleteDevice },

];
async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    try {
        const route = routes.find(route => event.resource === route.path && event.httpMethod === route.method);
        if (route) {
            return await route.handler(event, context, dynamoDBClient, cognitoClient);
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Not Found', event: event, routes: routes })
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify(error)
        }
    }
}

export { handler }