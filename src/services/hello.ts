import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 } from "uuid";



async function handler(event: APIGatewayProxyEvent, context: Context) {
    const response: APIGatewayProxyResult = {
        statusCode: 200,
        body: JSON.stringify("hello my lamnda" + v4())
    }
    console.log(event, "the event we need to check", process.env.TABLE_NAME);

    return response
}

export { handler }