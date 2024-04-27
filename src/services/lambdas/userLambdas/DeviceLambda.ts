import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { type DynamoDB } from 'aws-sdk';
import { v4 } from "uuid";
import { getUserId } from "../../utils/utils";
import { createData, deleteData, getAllData, getData, updateData } from "../../utils/queries";
import { AddThingToThingGroupCommand, CreateThingCommand, IoTClient, ListThingsInThingGroupCommand, UpdateThingGroupCommand } from "@aws-sdk/client-iot";

const iotClient = new IoTClient()
export class DeviceLambda {

    registerDevice = async (event: APIGatewayProxyEvent, context: Context, ddbClient: DynamoDB): Promise<APIGatewayProxyResult> => {
        const { motionSensorId, motionSensorName, lightId, lightName, roomId, roomName } = JSON.parse(event.body);

        try {
            const deviceId = v4();
            const userId = getUserId(event);

            const isCheckLightThing = await this.checkAndCreateThing(lightId);
            const isCheckMotionThing = await this.checkAndCreateThing(motionSensorId);

            if (isCheckLightThing || isCheckMotionThing) {
                return {
                    statusCode: 409,
                    body: JSON.stringify({
                        message: `Already register please check once!.`
                    })
                }
            }
            await createData(ddbClient, {
                TableName: process.env.DEVICE_TABLE_NAME,
                Item: {
                    'deviceId': { S: deviceId },
                    'userId': { S: userId },
                    'lightId': { S: lightId },
                    'lightName': { S: lightName },
                    'roomId': { S: roomId },
                    'roomName': { S: roomName },
                    'motionSensorName': { S: motionSensorName },
                    'motionSensorId': { S: motionSensorId },
                    'isRegistered': { BOOL: true },
                    'isMotionDetected': { BOOL: false },
                    'isLightOn': { BOOL: false },
                    'deviceStatus': { S: 'ACTIVE' },
                }
            })

            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: `Device is created successFully`,
                    deviceId: deviceId
                })
            }
        } catch (error) {
            console.log(error, "the error is");

            return {
                statusCode: 500,
                body: JSON.stringify({
                    Error: error,
                    env: lightId,
                    event: motionSensorId
                })
            }
        }
    }
    getDevice = async (event: APIGatewayProxyEvent, context: Context, ddbClient: DynamoDB): Promise<APIGatewayProxyResult> => {
        try {
            const deviceId = event.pathParameters?.id;
            const userId = getUserId(event);
            if (deviceId) {
                const result = await getData(ddbClient, {
                    TableName: process.env.DEVICE_TABLE_NAME,
                    Key: {
                        deviceId: { S: deviceId },
                        userId: { S: userId }
                    }
                });
                if (!result) {
                    return {
                        statusCode: 404,
                        body: JSON.stringify({
                            message: 'Device not found'
                        })
                    }
                }
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Device Details',
                        DeviceDetails: result
                    })
                }
            };
            await this.getAllDevices(event, context, ddbClient);
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify(error)
            }
        }
    }
    getAllDevices = async (event: APIGatewayProxyEvent, context: Context, ddbClient: DynamoDB): Promise<APIGatewayProxyResult> => {
        try {
            const userId = getUserId(event);
            const result: Record<string, any> = await getAllData(ddbClient, {
                TableName: process.env.DEVICE_TABLE_NAME,
                ScanFilter: {
                    userId: {
                        ComparisonOperator: 'EQ',
                        AttributeValueList: [{ S: userId }]
                    }
                }
            })

            if (!result) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        message: 'Devices not found'
                    })
                }
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'All Device Details',
                    DeviceDetails: result
                })
            }
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify(error)
            }
        }
    }
    updateDevice = async (event: APIGatewayProxyEvent, context: Context, ddbClient: DynamoDB): Promise<APIGatewayProxyResult> => {
        try {
            const userId = getUserId(event);
            const deviceId = event.pathParameters?.id;
            const attributesToUpdate = JSON.parse(event.body);


            const existingDevice = await getData(ddbClient, {
                TableName: process.env.DEVICE_TABLE_NAME,
                Key: {
                    deviceId: { S: deviceId },
                    userId: { S: userId }
                }
            })
            if (!existingDevice) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        message: 'Device not found'
                    })
                }
            }

            const updateParams: DynamoDB.UpdateItemInput = {
                TableName: process.env.DEVICE_TABLE_NAME,
                Key: {
                    'deviceId': { S: deviceId },
                    'userId': { S: userId }
                },
                UpdateExpression: 'SET',
                ExpressionAttributeValues: {},
                ReturnValues: 'UPDATED_NEW' // Optional: Return the updated item
            };

            // Perform the update operation
            const updatedItem = await updateData(ddbClient, updateParams, attributesToUpdate)

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Item updated successfully',
                    updatedItems: updatedItem
                })
            }
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify(error)
            }
        }
    }
    deleteDevice = async (event: APIGatewayProxyEvent, context: Context, ddbClient: DynamoDB): Promise<APIGatewayProxyResult> => {
        try {
            const userId = getUserId(event);
            const deviceId = event.pathParameters?.id;

            const result = await deleteData(ddbClient, {
                TableName: process.env.DEVICE_TABLE_NAME,
                Key: {
                    deviceId: { S: deviceId },
                    userId: { S: userId }
                }
            })

            if (result.$response.error) {
                return {
                    statusCode: 500,
                    body: JSON.stringify(result.$response.error)
                }
            }

            // Update Thing Group attributes to remove lightId and motionSensorId
            await iotClient.send(new UpdateThingGroupCommand({
                thingGroupName: process.env.IOT_THING_GROUP_NAME,
                thingGroupProperties: {
                    attributePayload: {
                        merge: false, // Set merge to false to remove attributes
                        attributes: {
                            lightId: 'lightId',
                            motionSensorId: 'motionSensorId'
                        }
                    }
                }
            }));


            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'User Details',
                    UserDetails: result
                })
            }
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify(error)
            }
        }
    }
    checkAndCreateThing = async (thingName) => {

        try {
            const thingsResponse = await iotClient.send(new ListThingsInThingGroupCommand({
                thingGroupName: process.env.IOT_THING_GROUP_NAME
            }));


            const lightThing = thingsResponse.things.some(thing => thing === thingName);
            console.log("the Thing Response is:", thingsResponse);
            if (lightThing) {
                return true
            }
            await iotClient.send(new CreateThingCommand({
                thingName: thingName,
                attributePayload: {
                    attributes: {
                        'isLightOn': 'false',
                        'isMotionDetected': 'false',
                        'deviceStatus': 'ACTIVE'
                    }
                }
            }));

            await iotClient.send(new AddThingToThingGroupCommand({
                thingGroupName: process.env.IOT_THING_GROUP_NAME,
                thingName: thingName
            }));

            return false

        } catch (error) {
            console.error("Error creating thing and adding to group:", error);
            throw new Error(error);
        }

    }
}