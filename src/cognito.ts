import { Construct } from 'constructs';
import { Resource, TerraformOutput } from 'cdktf';
import {
    cognito,
    iam
  } from '../.gen/providers/aws';

const config = require('../config.json');

export class Cognito extends Resource {
    public readonly userPoolArn: string;
    public readonly userPoolClientSecret: string;
    public readonly userPoolClientId: string;
    public readonly userPoolClientOauthScopes: string[];

    constructor(scope: Construct, name: string ) {
        super(scope, name);

        const snsPolicy = new iam.IamPolicy(this, 'sns-policy', {
            name: config.name + '-sns-policy',
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: ['sns:publish'],
                    Resource: "*"
                }]
            })
        });

        const snsRole = new iam.IamRole(this, 'sns-role', {
            name: config.name + '-sns-role',
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: {
                        Service: "cognito-idp.amazonaws.com"
                    },
                    Action: "sts:AssumeRole",
                    Sid: ""
                }]
            })
        })

        new iam.IamRolePolicyAttachment(this, 'sns-iam-attachment', {
            role: snsRole.name as string,
            policyArn: snsPolicy.arn
        });

        const userPool = new cognito.CognitoUserPool(this, 'cognito-user-pool', {
            name: config.name,
            autoVerifiedAttributes: config.cognito.autoVerifiedAttributes,
            mfaConfiguration: config.cognito.mfaConfiguration,
            smsConfiguration: {
                externalId: config.name + '-external',
                snsCallerArn: snsRole.arn
            },
            passwordPolicy: {
                minimumLength: config.cognito.passwordPolicy.minimumLength,
                requireLowercase: config.cognito.passwordPolicy.requireLowercase,
                requireNumbers: config.cognito.passwordPolicy.requireNumbers,
                requireSymbols: config.cognito.passwordPolicy.requireSymbols,
                requireUppercase: config.cognito.passwordPolicy.requireUppercase,
                temporaryPasswordValidityDays: config.cognito.passwordPolicy.temporaryPasswordValidityDays
            },
            schema: config.cognito.schema
        });

        new cognito.CognitoUserPoolDomain(this, 'cognito-domain', {
            domain: config.cognito.domain,
            userPoolId: userPool.id
        })
      
        const client = new cognito.CognitoUserPoolClient(this, 'cognito-client', {
            name: config.name + '-client',
            allowedOauthFlowsUserPoolClient: true,
            allowedOauthFlows: config.cognito.oauthFlows,
            allowedOauthScopes: config.cognito.oauthScopes,
            callbackUrls: config.cognito.callbackUrls,
            generateSecret: true,
            userPoolId: userPool.id,
            supportedIdentityProviders: ["COGNITO"]
        });

        new TerraformOutput(this, 'UserPoolARN', { value: userPool.arn })
        new TerraformOutput(this, 'UserPoolClientSecret', { value: client.clientSecret })
        new TerraformOutput(this, 'UserPoolClientId', { value: client.id })

        this.userPoolArn = userPool.arn
        this.userPoolClientSecret = client.clientSecret
        this.userPoolClientId = client.id
        this.userPoolClientOauthScopes = client.allowedOauthScopes
    }
}