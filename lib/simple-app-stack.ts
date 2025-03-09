import { movies,movieCasts } from "../seed/movies";
import * as cdk from 'aws-cdk-lib';
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";


export class SimpleAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const simpleFn = new lambdanode.NodejsFunction(this, "SimpleFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: `${__dirname}/../lambdas/simple.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

   
    const simpleFnURL = simpleFn.addFunctionUrl({
        authType: lambda.FunctionUrlAuthType.AWS_IAM,  
        cors: {
          allowedOrigins: ["*"],  
        },
      });
      
      const moviesTable = new dynamodb.Table(this, "MoviesTable", {
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,  
        partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER }, 
        removalPolicy: cdk.RemovalPolicy.DESTROY,            
        tableName: "Movies",                                 
    });
    
    
      
    const movieCastsTable = new dynamodb.Table(this, "MovieCastTable", {
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
        sortKey: { name: "actorName", type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        tableName: "MovieCast",
      });
      
      movieCastsTable.addLocalSecondaryIndex({
        indexName: "roleIx",
        sortKey: { name: "roleName", type: dynamodb.AttributeType.STRING },
      });
      new custom.AwsCustomResource(this, "moviesddbInitData", {
        onCreate: {
          service: "DynamoDB",
          action: "batchWriteItem",
          parameters: {
            RequestItems: {
              [moviesTable.tableName]: generateBatch(movies),
              [movieCastsTable.tableName]: generateBatch(movieCasts), 
            },
          },
          physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"),
        },
        policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [moviesTable.tableArn, movieCastsTable.tableArn],
        }),
      });
      const getMovieCastMembersFn = new lambdanode.NodejsFunction(
        this,
        "GetCastMemberFn",
        {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_22_X,
          entry: `${__dirname}/../lambdas/getMovieCastMembers.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            CAST_TABLE_NAME: movieCastsTable.tableName,
            
            REGION: "eu-west-1",
          },
        }
      );
     
      const getMovieCastMembersURL = getMovieCastMembersFn.addFunctionUrl({
        authType: lambda.FunctionUrlAuthType.NONE,
        cors: {
          allowedOrigins: ["*"],
        },
      });
  
     
      movieCastsTable.grantReadData(getMovieCastMembersFn);
  
     
      new cdk.CfnOutput(this, "Get Movie Cast Url", {
        value: getMovieCastMembersURL.url,
      });
  
     
    
  
    const getAllMoviesFn = new lambdanode.NodejsFunction(
    this,
    "GetAllMoviesFn",
    {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: `${__dirname}/../lambdas/getAllMovies.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: moviesTable.tableName,
        REGION: 'eu-west-1',
      },
    }
  );
  
 
  const getAllMoviesURL = getAllMoviesFn.addFunctionUrl({
    authType: lambda.FunctionUrlAuthType.NONE,
    cors: {
      allowedOrigins: ["*"],
    },
  });
  
 
  moviesTable.grantReadData(getAllMoviesFn);
  
  
  new cdk.CfnOutput(this, "Get All Movies Function URL", { value: getAllMoviesURL.url });
    const getMovieByIdFn = new lambdanode.NodejsFunction(
        this,
        "GetMovieByIdFn",
        {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_22_X,
          entry: `${__dirname}/../lambdas/getMovieById.ts`, 
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            TABLE_NAME: moviesTable.tableName, 
            REGION: 'eu-west-1',             
          },
        }
      );
      
      
      const getMovieByIdURL = getMovieByIdFn.addFunctionUrl({
        authType: lambda.FunctionUrlAuthType.NONE,
        cors: {
          allowedOrigins: ["*"],
        },
      });
      
      
      moviesTable.grantReadData(getMovieByIdFn);
     
      
      
      new cdk.CfnOutput(this, "GetMovieFunctionUrl", { value: getMovieByIdURL.url });
      
    new cdk.CfnOutput(this, "SimpleFunctionUrl", { value: simpleFnURL.url });
  }
}
