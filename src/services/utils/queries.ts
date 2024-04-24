import { type DynamoDB } from 'aws-sdk';
import { unmarshall } from '@aws-sdk/util-dynamodb';



export const createData = async (ddbClient: DynamoDB, query) => {
    return await ddbClient.putItem(query).promise();
}

export const getData = async (ddbClient: DynamoDB, query) => {
    const data: Record<string, any> = await ddbClient.getItem(query).promise();
    return unmarshall(data.Item);
}

export const getAllData = async (ddbClient: DynamoDB, query) => {
    const data: Record<string, any> = await ddbClient.scan(query).promise();
    return data.Items.map(item => unmarshall(item));
}

export const updateData = async (ddbClient: DynamoDB, query, attributesToUpdate) => {
    // Iterate over the attributes and construct the UpdateExpression and ExpressionAttributeValues
    Object.entries(attributesToUpdate).forEach(([attributeName, attributeValue]) => {
        if (attributeValue !== undefined && attributeValue !== null) {
            query.UpdateExpression += ` ${attributeName} = :${attributeName},`;
            query.ExpressionAttributeValues[`:${attributeName}`] = typeof attributeValue === 'boolean' ? { BOOL: attributeValue } : { S: attributeValue as string };
        }
    });

    // Remove trailing comma from UpdateExpression if attributes were added
    if (Object.values(attributesToUpdate).some(value => value !== undefined && value !== null)) {
        query.UpdateExpression = query.UpdateExpression.slice(0, -1); // Remove last comma
    }

    // Perform the update operation
    const updatedItem: Record<string, any> = await ddbClient.updateItem(query).promise();
    if (updatedItem.$response.error) throw new Error(updatedItem.$response.error);
    return unmarshall(updatedItem.Attributes);
}

export const deleteData = async (ddbClient: DynamoDB, query) => {
    return await ddbClient.deleteItem(query).promise();
}