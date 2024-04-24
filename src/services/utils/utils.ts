import { APIGatewayProxyEvent } from "aws-lambda";
import { decode } from 'jsonwebtoken'




export function parseJson(arg: string) {
    try {
        return JSON.parse(arg);
    } catch (error) {
        throw new Error(error.message)
    }

}

export function hasAdmin(event: APIGatewayProxyEvent) {
    try {
        const groups = event.requestContext.authorizer?.claims['cognito:groups']
        if (groups) {
            return groups.includes('Admin')
        }
        return false
    } catch (error) {
        throw new Error(error.message)
    }
}

export function getUserId(event: APIGatewayProxyEvent) {
    try {
        const userId = event.requestContext.authorizer?.claims['sub']
        return userId
    }
    catch (error) {
        throw new Error(error.message)
    }
}

export function getDetails(details: Record<string, any>): Record<string, any> {
    // Transform the DynamoDB response to remove the data type indicators
    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => [key, value.S])
    );
}
