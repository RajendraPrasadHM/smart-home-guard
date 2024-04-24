import { APIGatewayProxyEvent, APIGatewayProxyEventPathParameters, APIGatewayProxyResult, Context } from "aws-lambda";
import { type CognitoIdentityServiceProvider, type DynamoDB } from 'aws-sdk';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { getDetails, getUserId, hasAdmin } from "../../utils/utils";
import { emit } from "process";
import { createData, deleteData, getData, updateData } from "../../utils/queries";


export class UserLambda {

    registerUser = async (event: APIGatewayProxyEvent, context: Context, ddbClient: DynamoDB, cognitoClient: CognitoIdentityServiceProvider): Promise<APIGatewayProxyResult> => {
        try {
            const { userName, email, password, mobileNumber } = JSON.parse(event.body);
            const response = await cognitoClient.signUp({
                ClientId: process.env.CLIENT_ID,
                Username: email,
                Password: password,
                UserAttributes: [
                    { Name: 'email', Value: email }
                ]
            }).promise();

            const result = await createData(ddbClient, {
                TableName: process.env.TABLE_NAME,
                Item: {
                    id: { S: response.UserSub },
                    'email': { S: email },
                    'userName': { S: userName },
                    'phone': { S: mobileNumber },
                    'isHome': { BOOL: true },
                    'isAdmin': { BOOL: false },
                }
            })
            if (result.$response.error) {
                return {
                    statusCode: 500,
                    body: JSON.stringify(result.$response.error)
                }
            }
            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: 'User registered successfully',
                    cognitouUserId: response.UserSub,
                })
            }
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify(error)
            }
        }
    };
    verifyUser = async (event: APIGatewayProxyEvent, context: Context, ddbClient?: DynamoDB, cognitoClient?: CognitoIdentityServiceProvider): Promise<APIGatewayProxyResult> => {
        try {
            const { email, otp, isForgetPassword, password } = JSON.parse(event.body);
            if (!isForgetPassword) {
                const response = await cognitoClient.confirmSignUp({
                    ClientId: process.env.CLIENT_ID,
                    Username: email,
                    ConfirmationCode: otp
                }).promise();
                if (response.$response.error) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            message: 'Invalid OTP'
                        })
                    }
                }
                return {
                    statusCode: 201,
                    body: JSON.stringify({
                        message: 'Email Verification Done',
                        cognitouUserId: response
                    })
                }
            }
            const response = await cognitoClient.confirmForgotPassword({
                ClientId: process.env.CLIENT_ID,
                Username: email,
                ConfirmationCode: otp,
                Password: password
            }).promise();


            if (response.$response.error) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'Invalid OTP'
                    })
                }
            }
            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: 'Email Verification Done',
                    cognitouUserId: response
                })
            }
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify(error)
            }
        }
    };
    loginUser = async (event: APIGatewayProxyEvent, context: Context, ddbClient?: DynamoDB, cognitoClient?: CognitoIdentityServiceProvider): Promise<APIGatewayProxyResult> => {
        try {
            const { email, password } = JSON.parse(event.body);;
            const response = await cognitoClient.initiateAuth({
                AuthFlow: 'USER_PASSWORD_AUTH',
                ClientId: process.env.CLIENT_ID,
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: password
                }
            }).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Login Successful',
                    LoginDetails: response
                })
            }
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify(error)
            }
        }
    };
    getUser = async (event: APIGatewayProxyEvent, context: Context, ddbClient: DynamoDB, cognitoClient?: CognitoIdentityServiceProvider): Promise<APIGatewayProxyResult> => {
        try {
            const subId = await getUserId(event);
            const result = await getData(ddbClient, {
                TableName: process.env.TABLE_NAME,
                Key: {
                    id: { S: subId }
                }
            });

            console.log("the result:", result)

            if (!result) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'No Records' })
                }
            }
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'User Details',
                    UserDetails: result,
                    subId: subId
                })
            }
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    Error: error,
                    userId: event,
                })
            }
        }
    };
    updateUser = async (event: APIGatewayProxyEvent, context: Context, ddbClient: DynamoDB, cognitoClient?: CognitoIdentityServiceProvider): Promise<APIGatewayProxyResult> => {
        try {
            const attributesToUpdate = JSON.parse(event.body);
            const userId = await getUserId(event);
            // Retrieve the existing item from DynamoDB
            const existingItem = await getData(ddbClient, {
                TableName: process.env.TABLE_NAME,
                Key: {
                    'id': { S: userId } // Assuming userId is the partition key
                }
            })

            // Check if the item exists
            if (!existingItem.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Item not found' })
                };
            }

            // Construct the UpdateExpression to update specific fields
            const updateParams: DynamoDB.UpdateItemInput = {
                TableName: process.env.TABLE_NAME,
                Key: {
                    'id': { S: userId }
                },
                UpdateExpression: 'SET',
                ExpressionAttributeValues: {},
                ReturnValues: 'UPDATED_NEW' // Optional: Return the updated item
            };

            const updatedItem = await updateData(ddbClient, updateParams, attributesToUpdate);

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Item updated successfully', updatedItems: updatedItem })
            };
        } catch (error) {
            console.error('Error updating item:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Internal server error ' + error, body: event.body, })
            };
        }
    };
    deleteUser = async (event: APIGatewayProxyEvent, ddbClient: DynamoDB): Promise<APIGatewayProxyResult> => {
        try {
            const { userId } = JSON.parse(event.pathParameters?.id);
            if (!hasAdmin(event)) {
                return {
                    statusCode: 403,
                    body: JSON.stringify({
                        message: 'You are not authorized to perform this action'
                    })
                }
            }
            const result = await deleteData(ddbClient, {
                TableName: process.env.TABLE_NAME,
                Key: {
                    id: { S: userId }
                }
            });

            if (!result) {
                return {
                    statusCode: 500,
                    body: JSON.stringify("something went wrong")
                }
            }
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
    };
}