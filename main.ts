import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import {
  AwsProvider } from './.gen/providers/aws';
import { Cognito } from "./src/cognito";
import { WebService } from "./src/app";

const config = require('./config.json');

class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);


    new AwsProvider(this, 'aws', {
      region: config.region 
    });

    const cognito = new Cognito(this, 'cognito');

    
    new WebService(this, 'webservice', {
      userPoolArn: cognito.userPoolArn,
      userPoolClientId: cognito.userPoolClientId
    });
  
  }
}

const app = new App();
new MyStack(app, "cdktf-aws-elb-cognito-auth");
app.synth();
