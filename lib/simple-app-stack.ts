import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class SimpleAppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // 创建 Lambda 函数
        const helloLambda = new lambda.Function(this, 'HelloHandler', {
            runtime: lambda.Runtime.NODEJS_18_X,
            code: lambda.Code.fromAsset('lambda'),
            handler: 'hello.handler'
        });

        // 创建 API Gateway
        new apigateway.LambdaRestApi(this, 'Endpoint', {
            handler: helloLambda
        });
    }
}
