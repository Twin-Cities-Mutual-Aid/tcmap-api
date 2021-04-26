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

	getSiteOperationInfo: getSiteOperationInfo,
	transformPublicTransit: transformPublicTransit,
	getWarmingSiteStatus: getWarmingSiteStatus
}

function validateRecord(record) {
	const has_org = record.fields.org_name !== ''
	const has_lng = record.fields.longitude !== undefined
	const has_lat = record.fields.latitude !== undefined

    return has_org && has_lng && has_lat 
}

function mapRecordFields(record, hours) {
	const distributingHours = getDistributingHours(record.fields, hours)
	const receivingHours = getReceivingHours(record.fields, hours)

	return {
		name: record.fields.org_name,
		mostRecentlyUpdatedAt: record.fields.last_updated,
		neighborhood: record.fields.neighborhood_name,
		address: record.fields.address,
		longitude: record.fields.longitude,
		latitude: record.fields.latitude,
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

function getDistributingHours(recordFields, hoursRecords) {
	if(recordFields.automate_hours) {
		const siteOperationInfo = getSiteOperationInfo(recordFields.distributes, recordFields.distributing_open, recordFields.distributing_close, hoursRecords, recordFields.closed_dates, recordFields.open_dates)

		return {
			currentlyOpenForDistributing: siteOperationInfo.openNow,
			openingForDistributingDonations: siteOperationInfo.opening,
			closingForDistributingDonations: siteOperationInfo.closing
		}
	}
	return {
		currentlyOpenForDistributing: recordFields.currently_open_for_distributing,
		openingForDistributingDonations: hoursUtils.transformHours(recordFields.opening_for_distributing),
		closingForDistributingDonations: hoursUtils.transformHours(recordFields.closing_for_distributing)
	}
}

function getReceivingHours(recordFields, hoursRecords) {
	if(recordFields.automate_hours) {
		const siteOperationInfo = getSiteOperationInfo(recordFields.receives, recordFields.receiving_open, recordFields.receiving_close, hoursRecords, recordFields.closed_dates, recordFields.open_dates)
		return {
			currentlyOpenForReceiving: siteOperationInfo.openNow,
			openingForReceivingDonations: siteOperationInfo.opening,
			closingForReceivingDonations: siteOperationInfo.closing
		}
	}

	return {
		currentlyOpenForReceiving: recordFields.currently_open_for_receiving,
		openingForReceivingDonations: hoursUtils.transformHours(recordFields.opening_for_receiving),
		closingForReceivingDonations: hoursUtils.transformHours(recordFields.closing_for_receiving)
	}
}

function getSiteOperationInfo(isOperationEnabled, operationOpenHoursArray, operationCloseHoursArray, hoursList, closedDates, openDates) {
    let openNow = NO
    let opening = NEVER
    let closing = undefined
    let operationHoursInfo = undefined
    let schedule = undefined
    let isEnabled = isOperationEnabled ? true : false
    try {
        if (isOperationEnabled) {
            schedule = (operationOpenHoursArray && operationCloseHoursArray) ? hoursUtils.getSchedule(operationOpenHoursArray, operationCloseHoursArray, hoursList) : undefined

            const isClosedToday = closedDates ? hoursUtils.checkIsClosedToday(closedDates) : false
            const hasOpenDates = openDates ? true : false
            const isOpenToday = hasOpenDates ? hoursUtils.checkIsOpenToday(openDates) : false
            if (!isClosedToday) {
                if (!hasOpenDates || (hasOpenDates && isOpenToday)) {
                    const today = schedule ? schedule.find(({ isToday }) => isToday === true) : undefined
                    operationHoursInfo = today ? hoursUtils.getHoursInfo(today.hours, today.is24Hours) : undefined
                    openNow = operationHoursInfo ? (operationHoursInfo.isOpenNow ? YES : NO) : undefined
                    openingTimes = today ? today.hours.map(period => period.openTime) : NOT_TODAY
                    closingTimes = today ? today.hours.map(period => period.closeTime) : undefined
                    opening = openingTimes.length > 0 ? openingTimes : NOT_TODAY
                    closing = closingTimes.length > 0 ? closingTimes : NOT_TODAY
                } else {
                    openNow = NO
                    opening = NOT_TODAY
                    closing = undefined
                }
            } else {
                openNow = NO
                opening = NOT_TODAY
                closing = undefined
            }
        }
    } catch (exception) {
        console.log(exception)

        openNow = NO
        opening = NOT_TODAY
        closing = undefined
    }

    return {
        isEnabled: isEnabled,
        openNow: openNow,
        opening: opening,
        closing: closing,
        hoursInfo: operationHoursInfo,
        schedule: schedule
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
