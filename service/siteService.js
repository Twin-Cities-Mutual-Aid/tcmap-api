
const airtableClient = require('../airtableClient')
const cacheService = require('./cacheService')

const LIGHTRAIL_ICON = "tram"
const BUS_ICON = "directions_bus"
const BLUELINE = "BLUELINE"
const GREENLINE = "GREENLINE"
const BUS = "BUS"
const PURPLE = "#771473"
const BLUE = "#0055A5"
const GREEN = "#00B100"

module.exports = {

	getMutualAidSites: async function(requestPath) {
		const cachePath = cacheService.getCachePath(requestPath);
		const cachedResult = cacheService.readCache(cachePath);

		try {
			if (cachedResult != null) {
				console.log("Cache hit. Returning cached result for " + requestPath);
				return cachedResult
			} else {
				const siteRecords = await airtableClient.getMutualAidSites()
					.catch( e => {
						console.error("There was an error getting mutual aid sites: " + e.message)
						// TODO: Send slack? alert so there's visibility into the error!!
						return cacheService.readCacheBypassInterval(cachePath)
					})
				const result = siteRecords
						.filter(validateRecord)
						.map(mapRecordFields)
				cacheService.writeCache(cachePath, result);
				return result
			}
		} catch (e) {
			console.error("There was an error mapping mutual aid sites, returning cached data. Error is: " + e.message)
			// TODO: Send slack? alert so there's visibility into the error!!
			return cacheService.readCacheBypassInterval(cachePath)
		}
	},

	transformPublicTransit: transformPublicTransit,

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
		noIdNeeded: record.fields.no_id_needed,
		someInfoRequired: record.fields.some_info_required,
		warmingSite: record.fields.warming_site,
		publicTransitOptions: transformPublicTransit(record.fields.public_transit),
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
		return `${hours}:${minutes} ${ampm}`
	} else {
		return time
	}
}

function transformPublicTransit(publicTransitOptions) {
	return publicTransitOptions ? getPublicTransit(publicTransitOptions) : undefined
}

/**
 *  Formats the list of public transit options
 * 
 *  @param {array} publicTransitOptions - The list of public transit options, each in the format [name/#]-[BLUELINE/GREENLINE/BUS]-([#] blocks)
 */
getPublicTransit = function(publicTransitOptions) {
	let options = []
	if(publicTransitOptions) {
		publicTransitOptions.forEach(function(transitOption) {
			// matches regex for a hyphen to check that transit option has at least two hyphens
			if((transitOption.match(/-/g) || []).length > 1) {
				const properties = transitOption.split("-")
				const route = getTransitOption(properties)
				options.push(route)
			}
		})
	}
	return options
}

getTransitOption = function(properties) {
	const routeName = properties[0]
	const type = properties[1]
	const distance = properties[2]

	switch(type) {
		case BLUELINE:
			return { routeName: routeName, backgroundColor: BLUE, icon: LIGHTRAIL_ICON, distance: distance }
		case GREENLINE:
			return { routeName: routeName, backgroundColor: GREEN, icon: LIGHTRAIL_ICON, distance: distance }
		case BUS:
			return { routeName: routeName, backgroundColor: PURPLE, icon: BUS_ICON, distance: distance }
		default:
			return ""
	}
}
