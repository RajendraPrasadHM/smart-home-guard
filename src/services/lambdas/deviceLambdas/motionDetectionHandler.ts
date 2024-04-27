// index.js (or index.ts if using TypeScript)
import * as AWS from 'aws-sdk';
import * as dotenv from 'dotenv';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { getUserId } from '../../utils/utils';

dotenv.config();

// Initialize the AWS IoT SDK add the certificates
const iotData = new AWS.IotData({
    endpoint: 'arproyob0evrh-ats.iot.us-east-1.amazonaws.com',
    region: 'us-east-1',
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
});


const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        const { motionDetected } = JSON.parse(event.body);
        const userId = getUserId(event);
        const deviceId = event.pathParameters.id;

        console.log("the body: ", userId, "deviceId: ", deviceId, " status ", motionDetected);


        const result = await lightAction(deviceId, userId, motionDetected);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Motion is Detected, action is done!.',
                data: motionDetected,
                action: result
            })
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'User registered successfully',
                error: error
            })
        }
    }
};

// Function to turn on or off the light
async function lightAction(deviceId, userId, motionDetected) {
    try {
        const publishParams = {
            topic: 'home/user/light/control',
            payload: JSON.stringify({
                "userId": userId,
                "deviceId": deviceId,
                "command": motionDetected ? 'ON' : 'OFF'
            })
        }
        await iotData.publish(publishParams).promise();
        return true;
    } catch (error) {
        console.log("the Light Action Error: ", error);

        throw new Error('Error turning on the light: ' + error);
    }
}

export { handler }
