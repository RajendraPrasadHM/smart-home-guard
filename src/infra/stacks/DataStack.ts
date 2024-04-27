import { Construct, Stack, StackProps, RemovalPolicy } from '@aws-cdk/core';
import { AttributeType, ITable, Table } from "@aws-cdk/aws-dynamodb"




export class DataStack extends Stack {

    public readonly smartHomeTable: ITable
    public readonly smartHomeDeviceTable: ITable;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props)

        // User Table
        const userTable = new Table(this, 'SmartHomeUserTable', {
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
            tableName: 'SmartHomeUserTable',
            removalPolicy: RemovalPolicy.DESTROY,
        });

        this.smartHomeTable = userTable;

        // Device Table
        const deviceTable = new Table(this, 'SmartHomeDeviceTable', {
            partitionKey: {
                name: 'deviceId',
                type: AttributeType.STRING
            },
            sortKey: {
                name: 'userId',
                type: AttributeType.STRING
            },
            tableName: 'SmartHomeDeviceTable',
            removalPolicy: RemovalPolicy.DESTROY
        });
        deviceTable.addGlobalSecondaryIndex({
            indexName: "lightId",
            partitionKey: {
                name: 'lightId',
                type: AttributeType.STRING
            }
        });
        // deviceTable.addGlobalSecondaryIndex({
        //     indexName: "motionSensorId",
        //     partitionKey: {
        //         name: 'motionSensorId',
        //         type: AttributeType.STRING
        //     }
        // });

        this.smartHomeDeviceTable = deviceTable


    }
}