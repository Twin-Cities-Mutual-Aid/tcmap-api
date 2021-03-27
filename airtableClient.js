const Airtable = require('airtable');
require('dotenv').config();

const apiKey = process.env.AIRTABLE_API_KEY
const baseName = process.env.AIRTABLE_BASE_NAME
const base = new Airtable({apiKey: apiKey}).base(baseName);

/* Bottleneck, instanced as rateLimiter, allows us to conform to rate limits specified by Airtable's API
Failure to comply with the Airtable rate limit locks down its API for 30 seconds
*/
const Bottleneck = require('bottleneck');
const rateLimiter = new Bottleneck({
	minTime: 1000,
	maxConcurrent: 1
}) // ~1 requests per second since each of our Airtable calls actually call the api 4 times

async function fetchRecords(query) {
	return base('mutual_aid_locations')
		.select(query)
		.all()
}

// async function fetchHours() {
// 	return base('hours_periods')
// 		.select()
// 		.all()
// }

async function fetchHours() {
	return base('hours_periods_test')
		.select()
		.all()
}

// async function getHours() {
// 	const wrappedAirtableCall = rateLimiter.wrap(fetchHours)
// 	const result = await wrappedAirtableCall()
// 		.catch((error) => {
// 			throw new Error("Error fetching Airtable hours records" + error)
// 	})

// 	return result
// }

async function getHours() {
	const wrappedAirtableCall = rateLimiter.wrap(fetchHours)
	const result = await wrappedAirtableCall()
		.catch((error) => {
			throw new Error("Error fetching Airtable hours records" + error)
	})

	return result
}

module.exports = {
	getMutualAidSites: async function() {
		const field = 'org_name'
		const direction = 'asc'
		const query = {
			sort: [{field, direction}],
		}

		const wrappedAirtableCall = rateLimiter.wrap(fetchRecords);
		const result = await wrappedAirtableCall(query)
			.catch((error) => {
				throw new Error("Error fetching Airtable records" + error)
		  });

		return result
	},

	getHours: getHours,
	// getTimes: getTimes
}