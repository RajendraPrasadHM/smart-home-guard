// index.js (or index.ts if using TypeScript)
import * as AWS from 'aws-sdk';
import * as dotenv from 'dotenv';
import { getUserId } from '../../utils/utils';
import { getData } from '../../utils/queries';
dotenv.config();

// Initialize the DynamoDB client
const ddbClient = new AWS.DynamoDB();
const sns = new AWS.SNS();
const sqs = new AWS.SQS();
// Initialize the AWS IoT SDK
const iotData = new AWS.IotData({
    endpoint: 'arproyob0evrh-ats.iot.us-east-1.amazonaws.com',
    region: 'us-east-1',

});

const handler = async (event, context) => {
    try {
        const { motionDetected } = event;
        const userId = getUserId(event);
        const deviceId = event.pathParameters.id;

        console.log(process.env);


        // Retrieve user's devices from DynamoDB
        const getDevice = await getData(ddbClient, {
            TableName: process.env.DEVICE_TABLE_NAME,
            Key: {
                deviceId: { S: deviceId },
                userId: { S: userId }
            }
        });

        // Check if user is on holiday
        const isUserOnHoliday = await checkUserOnHoliday(userId);

        // If user is on holiday and motion is detected, send holiday notification
        if (motionDetected) {
            if (isUserOnHoliday) {
                // await sendHolidayNotification(userId);
            }
            await controlLight(getDevice, motionDetected);
        }

        return { statusCode: 200, body: 'Execution completed. Light is ON' };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: 'Internal server error.', Error: error, Event: event };
    }
};


async function checkUserOnHoliday(userId) {
    try {
        const getUserData = await getData(ddbClient, {
            TableName: process.env.TABLE_NAME,
            Key: {
                id: { S: userId }
            }
        });
        if (getUserData && !getUserData.isHome) {
            return true;
        }

        return false;


    } catch (error) {
        console.log(error);
        throw new Error('Error checking user on holiday: ' + error);
    }
}

async function sendHolidayNotification(userId) {
    // Send holiday notification
    const params = {
        Message: `Motion detected at home while you're on not in home. Please check your home security.`,
        Subject: 'Holiday Motion Detection Alert',
        TopicArn: process.env.HOLIDAY_NOTIFICATION_TOPIC_ARN
    };
    await sns.publish(params).promise();
}

async function controlLight(deviceData, motionDetected) {
    try {

        // Determine the device ID from the topic
        const deviceId = deviceData.deviceId; // Assuming the topic format is 'home/user/light/control/deviceId'
        const lightId = deviceData.lightId; // Assuming the topic format is 'home/user/light/control/deviceId'
        const motionSensorId = deviceData.motionSensorId; // Assuming the topic format is 'home/user/light/control/deviceId'

        // Control the light based on motion detection status
        if (motionDetected) {
            await turnOnLight(deviceId);
        } else {
            await turnOffLight(deviceId);
        }
        return {
            statusCode: 200,
            body: `'Light control operation successful' ${motionDetected ? 'LIGHT ON' : 'LIGHT OFF'}`,
            data: deviceData
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: 'Error handling the request'
        };
    }
};

// Function to turn on the light
async function turnOnLight(deviceId) {
    try {
        // Send command to turn on the light
        const send = await iotData.publish({
            topic: 'home/user/light/control',
            payload: JSON.stringify({ command: 'turnOn' }), // Assuming the light control command is 'turnOn'
            qos: 0
        }).promise();
        console.log(send, "the send");
        console.log("will check if it is");

        return send;

    } catch (error) {
        console.log(error);
        throw new Error('Error turning on the light: ' + error);
    }
}

// Function to turn off the light
async function turnOffLight(deviceId) {
    try {
        // Send command to turn off the light
        const offSend = await iotData.publish({
            topic: `home/user/light/control`,
            payload: JSON.stringify({ command: 'turnOff' }), // Assuming the light control command is 'turnOff'
            qos: 1
        }).promise();
        console.log(offSend, "the offSend");
        console.log("will check if it is off or not");
        return offSend;
    } catch (error) {
        console.log(error);
        throw new Error('Error turning off the light: ' + error);
    }
}

export { handler }
