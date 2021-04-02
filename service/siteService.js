const airtableClient = require('../airtableClient')
const cacheService = require('./cacheService')
const hoursUtils = require('../utils/hoursUtils.js')


const LIGHTRAIL_ICON = "tram"
const BUS_ICON = "directions_bus"
const BLUELINE = "BLUELINE"
const GREENLINE = "GREENLINE"
const BUS = "BUS"
const PURPLE = "#771473"
const BLUE = "#0055A5"
const GREEN = "#00B100"
const NEVER = "never"
const NOT_TODAY = "not today"
const NO = "no"
const YES = "yes"

module.exports = {

	getMutualAidSites: async function(requestPath) {
		const cachePath = cacheService.getCachePath(requestPath);
		const cachedResult = cacheService.readCache(cachePath, false);

		try {
			if (cachedResult != null) {
				console.log("Cache hit. Returning cached result for " + requestPath);
				return cachedResult
			} else {
				const hours = await airtableClient.getHours()
					.catch( e => {
						console.error("There was an error getting hours: " + e.message)
						// TODO: Send slack? alert so there's visibility into the error!!
						return cacheService.readCache(cachePath, true)
					})

				const siteRecords = await airtableClient.getMutualAidSites()
					.catch( e => {
						console.error("There was an error getting mutual aid sites: " + e.message)
						// TODO: Send slack? alert so there's visibility into the error!!
						return cacheService.readCache(cachePath, true)
					})
				const result = siteRecords
						.filter(validateRecord)
						.map(siteRecord => mapRecordFields(siteRecord, hours))
				cacheService.writeCache(cachePath, result)
				return result
			}
		} catch (e) {
			console.error("There was an error mapping mutual aid sites, returning cached data. Error is: " + e.message)
			// TODO: Send slack? alert so there's visibility into the error!!
			return cacheService.readCache(cachePath, true);
		}
	},

	transformPublicTransit: transformPublicTransit,
	getWarmingSiteStatus: getWarmingSiteStatus,
	getColor: getColor
}

function validateRecord(record) {
	const has_org = record.fields.org_name !== ''
	const has_lng = record.fields.longitude !== undefined
	const has_lat = record.fields.latitude !== undefined

	return has_org && has_lng && has_lat 
}

function mapRecordFields(record, hours) {
	const distributingHours = getDistributingHours(record, hours)
	const receivingHours = getReceivingHours(record, hours)

	return {
		name: record.fields.org_name,
		neighborhood: record.fields.neighborhood_name,
		address: record.fields.address,
		longitude: record.fields.longitude,
		latitude: record.fields.latitude,
		mostRecentlyUpdatedAt: record.fields.last_updated,
		...distributingHours,
		...receivingHours,
		urgentNeed: record.fields.urgent_need,
		seekingMoney: record.fields.seeking_money,
		seekingMoneyURL: record.fields.seeking_money_url,
		noIdNeeded: record.fields.no_id_needed,
		someInfoRequired: record.fields.some_info_required,
		warmingSite: getWarmingSiteStatus(record.fields.automate_warming_site_status, record.fields.currently_open_for_distributing, record.fields.warming_site),
		publicTransitOptions: transformPublicTransit(record.fields.public_transit),
		accepting: record.fields.accepting,
		notAccepting: record.fields.not_accepting,
		seekingVolunteers: record.fields.seeking_volunteers,
		notes: record.fields.notes
	}
}

function getDistributingHours(record, hoursRecords) {
	if(record.fields.automate_hours) {
		const siteOperationInfo = getSiteOperationInfo(record.fields.distributes, record.fields.distributing_open, record.fields.distributing_close, hoursRecords)

		return {
			currentlyOpenForDistributing: siteOperationInfo.openNow,
			openingForDistributingDonations: siteOperationInfo.opening,
			closingForDistributingDonations: siteOperationInfo.closing
		}
	}
	return {
		currentlyOpenForDistributing: record.fields.currently_open_for_distributing,
		openingForDistributingDonations: hoursUtils.transformHours(record.fields.opening_for_distributing),
		closingForDistributingDonations: hoursUtils.transformHours(record.fields.closing_for_distributing),
	}
}

function getReceivingHours(record, hoursRecords) {
	if(record.fields.automate_hours) {
		const siteOperationInfo = getSiteOperationInfo(record.fields.receives, record.fields.receiving_open, record.fields.receiving_close, hoursRecords)
		return {
			currentlyOpenForReceiving: siteOperationInfo.openNow,
			openingForReceivingDonations: siteOperationInfo.opening,
			closingForReceivingDonations: siteOperationInfo.closing
		}
	}

	return {
		currentlyOpenForReceiving: record.fields.currently_open_for_receiving,
		openingForReceivingDonations: hoursUtils.transformHours(record.fields.opening_for_receiving),
		closingForReceivingDonations:  hoursUtils.transformHours(record.fields.closing_for_receiving),
	}
}

function getSiteOperationInfo(isOperationEnabled, operationOpenHoursArray, operationCloseHoursArray, hoursList) {
	let openNow = NO
	let opening = NEVER
	let closing = undefined
	let operationHours = undefined
	let isEnabled = isOperationEnabled ? true : false
	if(isOperationEnabled) {
		operationHours = (operationOpenHoursArray && operationCloseHoursArray) ? hoursUtils.getHoursInfo(operationOpenHoursArray, operationCloseHoursArray, hoursList) : undefined
		const today = operationHours ? operationHours.hours.find( ({ isToday }) => isToday === true ) : undefined
		openNow = operationHours ? (operationHours.isOpenNow ? YES : NO) : undefined
		opening = today ? today.openTime : NOT_TODAY
		closing = today ? today.closeTime : undefined
	}
	
	return {
		isEnabled: isEnabled,
		openNow: openNow,
		opening: opening,
		closing: closing,
		hoursInfo: operationHours
	}
}

function getWarmingSiteStatus(automateWarmingSiteStatus, currentlyOpenForDistributing, warmingSite) {
	if(automateWarmingSiteStatus) {
		return currentlyOpenForDistributing === YES ? true : undefined
	} else {
		return warmingSite
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
function getPublicTransit(publicTransitOptions) {
	let options = []
	if(publicTransitOptions) {
		publicTransitOptions.forEach(function(transitOption) {
			// matches regex for a hyphen to check that transit option has at least two hyphens
			if((transitOption.match(/-/g) || []).length > 1) {
				const properties = transitOption.split("-")
				const route = getTransitOption(properties)
				if (route) options.push(route)
			}
		})
	}
	return options.length > 0 ? options : undefined
}

function getTransitOption(properties) {
	const routeName = properties[0]
	const type = properties[1]
	const distance = properties[2]

	switch(type) {
		case BLUELINE:
			return { routeName: routeName, backgroundColor: BLUE, icon: LIGHTRAIL_ICON, distance: distance, altText: `${BLUELINE} light rail, ${distance} away` }
		case GREENLINE:
			return { routeName: routeName, backgroundColor: GREEN, icon: LIGHTRAIL_ICON, distance: distance, altText: `${GREENLINE} light rail, ${distance} away` }
		case BUS:
			return { routeName: routeName, backgroundColor: PURPLE, icon: BUS_ICON, distance: distance, altText: `${routeName} bus, ${distance} away` }
		default:
			return
	}
}
