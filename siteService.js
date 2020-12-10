
const airtableClient = require('./airtableClient');
const cacheService = require('./cacheService');

module.exports = {

	getMutualAidSites: async function(requestPath) {
		const cachePath = cacheService.getCachePath(requestPath);
		const cachedResult = cacheService.readCache(cachePath);

		if (cachedResult != null) {
			console.log("Cache hit. Returning cached result for " + requestPath);
			return cachedResult
		} else {
			const siteRecords = await airtableClient.getMutualAidSites()
				.catch( e => {
					console.error("There was an error getting mutual aid sites: " + e.message)
					// TODO: Send slack? alert so there's visibility into the error!!
					return cacheService.readCacheBypassInterval
				})
			const result = siteRecords
					.filter(validateRecord)
					.map(mapRecordFields)
			cacheService.writeCache(cachePath, result);
			return result
		}
	}
	
}

validateRecord = function(record) {
	const has_org = record.fields.org_name !== ''
	const has_lng = record.fields.longitude !== undefined
	const has_lat = record.fields.latitude !== undefined
	const has_color = record.fields.color !== undefined

	return has_org && has_lng && has_lat && has_color
}

mapRecordFields = function(record) {
	return {
		name: record.fields.org_name,
		neighborhood: record.fields.neighborhood_name,
		address: record.fields.address,
		longitude: record.fields.longitude,
		latitude: record.fields.latitude,
		mostRecentlyUpdatedAt: record.fields.last_updated,
		currentlyOpenForDistributing: record.fields.currently_open_for_distributing,
		openingForDistributingDonations: record.fields.opening_for_distributing,
		openingForDistributingDonations: transformHours(record.fields.opening_for_distributing),
		closingForDistributingDonations: transformHours(record.fields.closing_for_distributing),
		currentlyOpenForReceiving: record.fields.currently_open_for_receiving,
		openingForReceivingDonations: transformHours(record.fields.opening_for_receiving),
		closingForReceivingDonations:  transformHours(record.fields.closing_for_receiving),
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

transformHours = function(time) {
	if(!isNaN(time)) {
		const minutes = time[2] + time[3]
		var hours = time[0] + time[1]
		const ampm = hours >= 12 ? "pm" : "am"
		hours = (hours % 12) || 12
		return "${hours}:${minutes} ${ampm}"
	} else {
		return time
	}
}

