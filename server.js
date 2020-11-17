// init project
const express = require('express');
const app = express();

// API route to list rows from Airtable:

const connection = require('./airtable-api');

app.get("/api/ai/list/:page", function(request, response) {
  console.log("Handling AI list API request");
  connection.handleAIListRequest(request, response);
});

app.get("/api*", function(request, response) {
  
  const responseObject = {
    Error : "Invalid path"
  }
  
  response.status(400).end(JSON.stringify(responseObject));
});

app.listen(process.env.PORT || 3000, 
	() => console.log("Server is running..."));