const express = require('express');
const app = express();
const siteService = require('./service/siteService');

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	next();
});

// app.get("/v1/mutual_aid_sites", function(request, response) {
//   console.log("Handling mutual aid sites API request");
//   siteService.getMutualAidSites(request.path)
//     .then((result) =>
//       response.status(200).end(JSON.stringify(result))
//     )
// });

app.get("/v1/mutual_aid_sites", function(request, response) {
  console.log("Handling mutual aid sites API request");
  const type = request.query.type
  siteService.getMutualAidSites(request.path, type)
    .then((result) =>
      response.status(200).end(JSON.stringify(result))
    )
});

app.get("/health", function(request, response) {
  response.status(200).end("Ok")
})

app.get("/*", function(request, response) {
  
  const responseObject = {
    error : "Path not found"
  }
  
  response.status(404).end(JSON.stringify(responseObject));
});

app.listen(process.env.PORT || 3000, 
	() => console.log("Server is running..."));