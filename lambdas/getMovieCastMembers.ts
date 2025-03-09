import { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
  GetCommand, 
} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();

export const handler: Handler = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    const queryParams = event?.queryStringParameters;
    if (!queryParams) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing query parameters" }),
      };
    }

    if (!queryParams.movieId) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing movie Id parameter" }),
      };
    }

    const movieId = parseInt(queryParams.movieId);
    let commandInput: QueryCommandInput = {
      TableName: process.env.CAST_TABLE_NAME,
    };

    
    if (queryParams.roleName) {
      commandInput = {
        ...commandInput,
        IndexName: "roleIx",
        KeyConditionExpression: "movieId = :m AND begins_with(roleName, :r)",
        ExpressionAttributeValues: {
          ":m": movieId,
          ":r": queryParams.roleName,
        },
      };
    }
    
    else if (queryParams.actorName) {
      commandInput = {
        ...commandInput,
        KeyConditionExpression: "movieId = :m AND begins_with(actorName, :a)",
        ExpressionAttributeValues: {
          ":m": movieId,
          ":a": queryParams.actorName,
        },
      };
    }
    
    else {
      commandInput = {
        ...commandInput,
        KeyConditionExpression: "movieId = :m",
        ExpressionAttributeValues: {
          ":m": movieId,
        },
      };
    }

    
    const commandOutput = await ddbDocClient.send(new QueryCommand(commandInput));
    const castData = commandOutput.Items || [];

    
    let movieData = {}; 
    if (queryParams.movie === "true") { 
      const movieResult = await ddbDocClient.send(
        new GetCommand({
          TableName: process.env.MOVIE_TABLE_NAME,
          Key: { id: movieId }, 
        })
      );
      movieData = movieResult.Item || {};
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      
      body: JSON.stringify({
        movieDetails: movieData, 
        castData: castData,
      }),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error }),
    };
  }
};

function createDocumentClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient);
}
