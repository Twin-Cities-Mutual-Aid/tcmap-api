
const airtableClient = require('./airtableClient');
const cacheService = require('./cacheService');

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
		closingForDistributingDonations: record.fields.closing_for_distributing,
		currentlyOpenForReceiving: record.fields.currently_open_for_receiving,
		openingForReceivingDonations: record.fields.opening_for_receiving,
		closingForReceivingDonations:  record.fields.closing_for_receiving,
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
