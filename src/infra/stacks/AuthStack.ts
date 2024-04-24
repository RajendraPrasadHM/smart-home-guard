import { Construct, Stack, StackProps, CfnOutput, } from '@aws-cdk/core';
import { UserPool, UserPoolClient, CfnUserPoolGroup } from "@aws-cdk/aws-cognito"




export class AuthStack extends Stack {

    public userPool: UserPool;
    public userPoolClient: UserPoolClient;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props)
        this.createUserPool();
        this.createUserPoolClient();
        this.adminUserPool();
    }
    private createUserPool() {
        this.userPool = new UserPool(this, "SmartHomeUserPool", {
            selfSignUpEnabled: true,
            autoVerify: { email: true },
            signInAliases: {
                email: true
            },
            userPoolName: "SmartHomeUserPool",
        });
        new CfnOutput(this, 'SmartHomeUserPoolId', {
            value: this.userPool.userPoolId,
        });
    }
    private createUserPoolClient() {
        this.userPoolClient = this.userPool.addClient("SmartHomeUserPoolClient", {
            authFlows: {
                userPassword: true
            },
            userPoolClientName: "SmartHomeUserPoolClient"
        });
        new CfnOutput(this, 'SmartHomeUserPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
        });
    }
    private adminUserPool() {
        new CfnUserPoolGroup(this, 'AdminUserGroup', {
            groupName: 'Admin',
            userPoolId: this.userPool.userPoolId,
        })
    }
}

