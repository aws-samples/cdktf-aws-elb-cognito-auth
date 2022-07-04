import { Construct } from 'constructs';
import { Resource, Token, TerraformOutput } from 'cdktf';
import {
    iam,
    autoscaling,
    ec2,
    vpc,
    elb
  } from '../.gen/providers/aws';
import { readFileSync } from 'fs';

const config = require('../config.json');

export interface WebServiceProps {
    readonly userPoolArn: string;
    readonly userPoolClientId: string;
}

export class WebService extends Resource {
    constructor(scope: Construct, name: string, props: WebServiceProps ) {
        super(scope, name);

        const ami = new ec2.DataAwsAmi(this, 'amazonlinux', {
            mostRecent: true,
            owners: ["amazon"],
            filter: [
                {
                    name: "root-device-type",
                    values: ["ebs"] 
                },
                {
                    name: "virtualization-type",
                    values: ["hvm"]
                }
            ]
        });

        const elbSecurityGroup = new vpc.SecurityGroup(this, 'elb-sg', {
            name: config.name + '-elb',
            vpcId: config.vpcId,
            egress: [{
                fromPort: 0,
                toPort: 0,
                protocol: '-1',
                cidrBlocks: ["0.0.0.0/0"]
            }],
            ingress: [
                {
                    fromPort: 80,
                    toPort: 80,
                    protocol: 'tcp',
                    cidrBlocks: ["0.0.0.0/0"]
                },
                {
                    fromPort: 443,
                    toPort: 443,
                    protocol: 'tcp',
                    cidrBlocks: ["0.0.0.0/0"]
                }
            ]
        });

        const instanceSecurityGroup = new vpc.SecurityGroup(this, 'instance-sg', {
            name: config.name + '-webservice',
            vpcId: config.vpcId,
        });

        new vpc.SecurityGroupRule(this, 'instance-sg-rule', {
            type: "ingress",
            fromPort: 0,
            toPort: 65535,
            protocol: "tcp",
            sourceSecurityGroupId: Token.asString(elbSecurityGroup.id),
            securityGroupId: Token.asString(instanceSecurityGroup.id)
        });

        const role = new iam.IamRole(this, 'instance-role', {
            name: config.name + '-webservice-role',
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: {
                        Service: "ec2.amazonaws.com"
                    },
                    Action: "sts:AssumeRole",
                    Sid: ""
                }]
            })
        });

        new iam.IamRolePolicyAttachment(this, 'instance-iam-attachment', {
            role: role.name as string,
            policyArn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'
        });

        const instanceProfile = new iam.IamInstanceProfile(this, 'instance-profile', {
            name: config.name + '-webservice-instance-profile',
            role: role.name
        });

        const userDataScript = readFileSync('./user_data.sh', 'base64');

        const autoscalingTemplate = new ec2.LaunchTemplate(this, 'launch-template', {
            name: config.name + '-webservice',
            instanceType: config.webservice.instanceType,
            iamInstanceProfile: { arn: instanceProfile.arn },
            imageId: ami.id,
            vpcSecurityGroupIds: [instanceSecurityGroup.id],
            userData: userDataScript
        });

        const alb = new elb.Alb(this, 'alb', {
            name: config.name,
            internal: false,
            loadBalancerType: "application",
            securityGroups: [Token.asString(elbSecurityGroup.id)],
            subnets: config.publicSubnetIds
        });

        const targetGroup = new elb.AlbTargetGroup(this, 'tg', {
            name: config.name + '-root',
            port: 80,
            protocol: "HTTP",
            vpcId: config.vpcId,
            healthCheck: {
                path: "/",
                protocol: "HTTP",
                matcher: "200",
                interval: 10,
                timeout: 3,
                healthyThreshold: 2,
                unhealthyThreshold: 2
            }
        });

        const httpListener = new elb.LbListener(this, 'listener-http', {
            loadBalancerArn: alb.arn,
            port: 443,
            protocol: "HTTPS",
            sslPolicy: "ELBSecurityPolicy-2016-08",
            certificateArn: config.webservice.certificateArn,
            defaultAction: [{
                type: "forward",
                targetGroupArn: Token.asString(targetGroup.arn)
            }]
        });

        new elb.AlbListenerRule(this, 'listener-auth', {
            listenerArn: Token.asString(httpListener.arn),
            priority: 100,
            action: [
                {
                    type: "authenticate-cognito",
                    authenticateCognito: {
                        scope: "openid",
                        userPoolArn: props.userPoolArn,
                        userPoolClientId: props.userPoolClientId,
                        userPoolDomain: config.cognito.domain
                    }
                },
                {
                    type: "forward",
                    targetGroupArn: Token.asString(targetGroup.arn)
                }
            ],
            condition: [{
                pathPattern: {
                    values: [config.webservice.authenticationPath]
                }
            }]
        });

        new autoscaling.AutoscalingGroup(this, 'autoscaling-group', {
            name: config.name + '-group',
            minSize: config.webservice.minSize,
            maxSize: config.webservice.maxSize,
            desiredCapacity: config.webservice.desiredCapacity,
            vpcZoneIdentifier: config.privateSubnetIds,
            targetGroupArns: [targetGroup.arn],
            healthCheckType: "ELB",
            launchTemplate: {
                id: autoscalingTemplate.id,
                version: "$Latest"
            },
            tag: [{
                key: "Name",
                value: config.name + '-webservice',
                propagateAtLaunch: true
            }]
        });

        new TerraformOutput(this, 'ELBDomainName', { value: alb.dnsName });
        new TerraformOutput(this, 'CallBackURL', { value: alb.dnsName+'/oauth2/idpresponse' });
        new TerraformOutput(this, 'AuthenticationPath', { value: alb.dnsName+'/users/users.html' });
    }
}