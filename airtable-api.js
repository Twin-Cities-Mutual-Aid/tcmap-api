const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY
const baseName = process.env.AIRTABLE_BASE_NAME

// ^ Configure Airtable using values in 🗝.env
const base = new Airtable({apiKey: apiKey}).base(baseName);


/* Bottleneck, instanced as rateLimiter, allows us to conform to rate limits specified by Airtable's API
Failure to comply with the Airtable rate limit locks down its API for 30 seconds
*/
const Bottleneck = require('bottleneck');
const rateLimiter = new Bottleneck({
  minTime: 1050 / 5
}) // ~5 requests per second


prepareResult = function(record) {
	return {
		name: record.fields.org_name,
		neighborhood: record.fields.neighborhood_name,
		address: record.fields.address,
		longitude: record.fields.longitude,
		latitude: record.fields.latitude,
		mostRecentlyUpdatedAt: record.fields.last_updated,
		currentlyOpenForDistributing: record.fields.currently_open_for_distributing,
		openingForDistributingDonations: record.fields.opening_for_distributing_donations,
		closingForDistributingDonations: record.fields.closing_for_distributing_donations,
		currentlyOpenForReceiving: record.fields.currently_open_for_receiving,
		openingForReceivingDonations: record.fields.opening_for_receiving_donations,
		closingForReceivingDonations:  record.fields.closing_for_receiving_donations,
		urgentNeed: record.fields.urgent_need,
		seekingMoney: record.fields.seeking_money,
		seekingMoneyURL: record.fields.seeking_money_url,
		accepting: record.fields.accepting,
		notAccepting: record.fields.not_accepting,
		seekingVolunteers: record.fields.seeking_volunteers,
		notes: record.fields.notes,
		color: record.fields.color
	}
}
  
validateRecord = function(record) {
	const has_org = record.fields.org_name !== ''
	const has_lng = record.fields.longitude !== undefined
	const has_lat = record.fields.latitude !== undefined
	const has_color = record.fields.color !== undefined

	return has_org && has_lng && has_lat && has_color
}



const cache = require('./caching');

function sendResultWithResponse(result, response) {
  response.status(200).end(JSON.stringify(result));
}

function cachePathForRequest(request) {
  return '.newcache' + request.path + '.json';  
}

module.exports = {

  handleAIListRequest: function(request, response) {
    
    var cachePath = cachePathForRequest(request);
    
    var cachedResult = cache.readCacheWithPath(cachePath);

    if (cachedResult != null) {
      console.log("Cache hit. Returning cached result for " + request.path);
      sendResultWithResponse(cachedResult, response);
    }
    else {
      
      console.log("Cache miss. Loading from Airtable for " + request.path);

      var pageNumber = 0;

      console.log("here")
      // rateLimiter.wrap(base(tableName).select().eachPage(function page(records, fetchNextPage) {
      //   console.log("in each page")
      //   if (pageNumber == request.params.page) {

      //     var results = [];

      //     records.forEach(function(record) {
            
      //       var result = {
      //       //   name: record.get('org_name'),
      //         name: record.fields.org_name
      //       }
      //       results.push(result);
      //     });
      //     cache.writeCacheWithPath(cachePath, results);
      //     console.log("Returning records");
      //     sendResultWithResponse(results, response);

      //   } else {
      //     pageNumber++;
      //     fetchNextPage();
      //   }

      // }, function done(error) {
			// 	console.log(error)
			// 	sendResultWithResponse([], response);
      // }));


			const field = 'org_name'
			const direction = 'asc'
			const query = {
				sort: [{field, direction}],
			}
      rateLimiter.wrap(base('mutual_aid_locations')
        .select(query)
        .all()
        .then( function(records) {
					console.log("in base call")
					// return records
					// 	.filter(validateRecord)
					// 	.map(prepareResult)
					results = records
						.filter(validateRecord)
						.map(prepareResult)
					cache.writeCacheWithPath(cachePath, results);
					sendResultWithResponse(results, response);
      }))

    }

  }

}

