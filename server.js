const express = require('express');
const app = express();
const airtable = require('./airtable-api');

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	next();
});

app.get("/mutual_aid_sites", function(request, response) {
  console.log("Handling mutual aid sites API request");
  airtable.getMutualAidSites(request, response);
});

app.get("/*", function(request, response) {
  
  const responseObject = {
    error : "Invalid path"
  }
  
  response.status(400).end(JSON.stringify(responseObject));
});

app.listen(process.env.PORT || 3000, 
	() => console.log("Server is running..."));