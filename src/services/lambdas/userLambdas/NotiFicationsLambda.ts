import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { type DynamoDB } from 'aws-sdk';
import { v4 } from "uuid";
import { getUserId } from "../../utils/utils";
import { createData, deleteData, getAllData, getData, updateData } from "../../utils/queries";
import { AddThingToThingGroupCommand, CreateThingCommand, IoTClient, ListThingsInThingGroupCommand, UpdateThingGroupCommand } from "@aws-sdk/client-iot";

export class NotificationsLambda {

    getNotification = async (event: APIGatewayProxyEvent, context: Context, ddbClient: DynamoDB): Promise<APIGatewayProxyResult> => {
        try {
            const alertId = event.pathParameters?.id;
            const userId = getUserId(event);
            if (alertId) {
                const result = await getData(ddbClient, {
                    TableName: process.env.NOTIFICATION_TABLE_NAME,
                    Key: {
                        alertId: { S: alertId },
                        userId: { S: userId }
                    }
                });
                if (!result) {
                    return {
                        statusCode: 404,
                        body: JSON.stringify({
                            message: 'Alert Not Found'
                        })
                    }
                }
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Notification Details',
                        DeviceDetails: result
                    })
                }
            };
            await this.getAllNotification(event, context, ddbClient);
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify(error)
            }
        }
    }
    getAllNotification = async (event: APIGatewayProxyEvent, context: Context, ddbClient: DynamoDB): Promise<APIGatewayProxyResult> => {
        try {
            const userId = getUserId(event);
            const result: Record<string, any> = await getAllData(ddbClient, {
                TableName: process.env.NOTIFICATION_TABLE_NAME,
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
                        message: 'Alert not found'
                    })
                }
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'All Notifications Details',
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
    deleteNotification = async (event: APIGatewayProxyEvent, context: Context, ddbClient: DynamoDB): Promise<APIGatewayProxyResult> => {
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

            if (!result) {
                return {
                    statusCode: 500,
                    body: JSON.stringify(result.$response.error)
                }
            }
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Notifcation Deleted',
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
}