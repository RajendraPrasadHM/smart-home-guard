// index.js (or index.ts if using TypeScript)
import * as AWS from 'aws-sdk';
import * as dotenv from 'dotenv';
import { createData, getData, updateData } from '../../utils/queries';
import { sendEmail } from '../../utils/email';
import { IoTClient, ListThingsInThingGroupCommand, UpdateThingCommand } from "@aws-sdk/client-iot";
import { v4 } from 'uuid';

const iotClient = new IoTClient()
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

const handler = async (event) => {
    try {
        console.log('Received event:', JSON.stringify(event, null, 2));

        // Access event data and process accordingly
        const { command, userId, deviceId } = event;

        const getUserDetails = await getData(ddbClient, {
            TableName: process.env.TABLE_NAME,
            Key: {
                id: { S: userId }
            }
        });
        const getDeviceDetails = await getData(ddbClient, {
            TableName: process.env.DEVICE_TABLE_NAME,
            Key: {
                deviceId: { S: deviceId },
                userId: { S: userId }
            }
        });

        if (!getUserDetails && !getDeviceDetails) {
            return {
                statusCode: 401,
                message: "Something went wrong on the userId and Device Id"
            }
        }
        const isUserOnHome = getUserDetails.isHome;

        if (!isUserOnHome) {
            await sendNotificationToUser(getUserDetails, getDeviceDetails);
        }

        await updateThingDetails(getDeviceDetails, command);
        await updateDeviceDetails(getDeviceDetails, command);
        console.log('Device status updated successfully');
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Message processed successfully' })
        };

    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: 'Internal server error.', Error: error, Event: event };
    }
};

export { handler }

async function sendNotificationToUser(getUserDetails: Record<string, any>, getDeviceDetails: Record<string, any>) {
    try {
        const params = {
            Message: `Dear ${getUserDetails.userName}

Motion has been detected in Our Home, while you're away from home. Please take immediate action to ensure the security of your residence.
Room-Location: "${getDeviceDetails.roomName}".`,
            Subject: 'Motion Detection Alert',
            TopicArn: process.env.HOLIDAY_NOTIFICATION_TOPIC_ARN,
            MessageAttributes: {
                'userId': {
                    DataType: 'String',
                    StringValue: getUserDetails.id
                },
                'email': {
                    DataType: 'String',
                    StringValue: getUserDetails.email
                }
            }
        };
        await sendEmail(getUserDetails.email, params.Subject, params.Message);
        const snsPublish = await sns.publish(params).promise();
        console.log("the publish Data:", snsPublish);

        const result = await createData(ddbClient, {
            TableName: process.env.NOTIFICATION_TABLE_NAME,
            Item: {
                alertId: { S: v4() },
                userId: { S: getUserDetails.id },
                deviceId: { S: getDeviceDetails.deviceId },
                Date: { S: new Date().toISOString() },
                message: { S: JSON.stringify(params) },
                publishedData: { S: JSON.stringify(snsPublish) }
            }
        });
        console.log(result, "the result it is running");
        return 'Notification sent successfully'
    } catch (error) {
        console.error("Error :", error);
        throw new Error('Error sending notification to user: ' + error);
    }
}

async function updateDeviceDetails(getDeviceDetails, command) {
    try {
        const attributesToUpdate = {};
        if (command === 'ON') {
            attributesToUpdate['isLightOn'] = true,
                attributesToUpdate['isMotionDetected'] = true
        } else {
            attributesToUpdate['isLightOn'] = false,
                attributesToUpdate['isMotionDetected'] = false
        }

        const updateParams: AWS.DynamoDB.UpdateItemInput = {
            TableName: process.env.DEVICE_TABLE_NAME,
            Key: {
                'deviceId': { S: getDeviceDetails.deviceId },
                'userId': { S: getDeviceDetails.userId }
            },
            UpdateExpression: 'SET',
            ExpressionAttributeValues: {},
            ReturnValues: 'UPDATED_NEW' // Optional: Return the updated item
        };

        // Perform the update operation
        const updatedItem = await updateData(ddbClient, updateParams, attributesToUpdate);
        console.log("the updated data: ", updatedItem);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Item updated successfully', updatedItems: updatedItem })
        }
    }
    catch (error) {
        console.log(error);
        throw new Error('Error updating device details: ' + error);
    }
}
async function updateThingDetails(getDeviceDetails, command) {
    try {

        const thingsResponse = await iotClient.send(new ListThingsInThingGroupCommand({
            thingGroupName: process.env.IOT_THING_GROUP_NAME
        }));

        console.log("the Thing Response is:", thingsResponse);
        const lightThing = thingsResponse.things.find(thing => thing === getDeviceDetails.lightId);
        const motionThing = thingsResponse.things.find(thing => thing === getDeviceDetails.motionSensorId);

        let attributes = {}
        if (command === 'ON') {
            attributes = {
                'isLightOn': 'true',
                'isMotionDetected': 'true',
                'deviceStatus': 'ACTIVE'
            }
        } else {
            attributes = {
                'isLightOn': 'false',
                'isMotionDetected': 'false',
                'deviceStatus': 'ACTIVE'
            }
        }
        await iotClient.send(new UpdateThingCommand({
            thingName: lightThing,
            attributePayload: {
                attributes: attributes
            }
        }));

        await iotClient.send(new UpdateThingCommand({
            thingName: motionThing,
            attributePayload: {
                attributes: attributes
            }
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Item updated successfully', updatedItems: thingsResponse })
        }
    }
    catch (error) {
        console.log(error);
        throw new Error('Error updating device details: ' + error);
    }
}


