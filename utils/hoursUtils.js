const { DateTime, Interval } = require("luxon")

const AMERICA_CHICAGO = "America/Chicago"


module.exports = {
    
    getHoursInfo: getHoursInfo,
    transformHours: transformHours,
    getSchedule: getSchedule,
    getTodayWeekday: getTodayWeekday,
    checkIsClosedToday: checkIsClosedToday,
    checkIsOpenToday: checkIsOpenToday,
    checkIsOpenNow: checkIsOpenNow
    
}

function getHoursInfo(openTimeDigits, closeTimeDigits) {
    const hoursInfo = (openTimeDigits && closeTimeDigits) ? parseTodayHours(openTimeDigits, closeTimeDigits) : undefined

    if(hoursInfo) {
        return {
            ...hoursInfo
        }
    } else {
        return {
            isOpenNow: false,
            openingSoon: undefined,
            closingSoon: undefined
        }
    }
}

function transformHours(time) {
    if(!isNaN(time)) {
        const minutes = time[2] + time[3]
        var hours = time[0] + time[1]
        const ampm = hours >= 12 ? "PM" : "AM"
        hours = (hours % 12) || 12
        return `${hours}:${minutes}${ampm}`
    } else {
        return time
    }
}

function getSchedule(openingHours, closingHours, hoursList) {
    const openHoursRecords = openingHours.map( id => hoursList.find(x => x.id == id))
    const openHoursFields = openHoursRecords.map(x => x.fields)
    const closeHoursRecords = closingHours.map( id => hoursList.find(x => x.id == id))
    const closeHoursFields = closeHoursRecords.map(x => x.fields)

    const openHours = openHoursFields.map( hours => {
        return {
            weekdayDigit: hours.weekday_digit,
            time: hours.time,
            timeDigits: hours.time_digits, // 4-digit string of number from 0000 to 2359
        }
    })

    const closeHours = closeHoursFields.map( hours => {
        return {
            weekdayDigit: hours.weekday_digit,
            time: hours.time,
            timeDigits: hours.time_digits, // 4-digit string of number from 0000 to 2359
        }
    })

    return [
        getDaySchedule("sunday", 0, openHours, closeHours),
        getDaySchedule("monday", 1, openHours, closeHours),
        getDaySchedule("tuesday", 2, openHours, closeHours),
        getDaySchedule("wednesday", 3, openHours, closeHours),
        getDaySchedule("thursday", 4, openHours, closeHours),
        getDaySchedule("friday", 5, openHours, closeHours),
        getDaySchedule("saturday", 6, openHours, closeHours)
    ]
}

function getDaySchedule(weekday, dayDigit, formattedOpenHours, formattedCloseHours) {
    const openHours = (formattedOpenHours.find( ({ weekdayDigit }) => weekdayDigit === dayDigit ) || undefined)
    const closeHours = (formattedCloseHours.find( ({ weekdayDigit }) => weekdayDigit === dayDigit ) || undefined)
    let is24Hours = false
    if(openHours && closeHours) {
        is24Hours = check24Hours(openHours.timeDigits, closeHours.timeDigits)
    }

    return {
        day: weekday,
        dayDigit: dayDigit,
        hours: {
                openTime: openHours ? openHours.time : undefined,
                openTimeDigits: openHours ? openHours.timeDigits : undefined,
                closeTime: closeHours ? closeHours.time : undefined,
                closeTimeDigits: closeHours ? closeHours.timeDigits : undefined
        },
        is24Hours: is24Hours,
        isToday: checkIsToday(dayDigit),
    }
}

function parseTodayHours(openTimeDigits, closeTimeDigits) {
    const is24Hours = check24Hours(openTimeDigits, closeTimeDigits)
    
    if (!is24Hours) {
        const opening = DateTime.fromObject({hour: openTimeDigits.substring(0,2), minutes: openTimeDigits.substring(2,4), zone: AMERICA_CHICAGO}).toUTC()
        const closing = DateTime.fromObject({hour: closeTimeDigits.substring(0,2), minutes: closeTimeDigits.substring(2,4), zone: AMERICA_CHICAGO}).toUTC()
        const nowTime = DateTime.now().toUTC()
        const isOpenNow = checkIsOpenNow(opening, closing, nowTime)
        const openingSoon = !isOpenNow ? checkIsNearHoursStartOrEnd(opening, nowTime) : false
        const closingSoon = isOpenNow ? checkIsNearHoursStartOrEnd(closing, nowTime) : false
        
        return {
            isOpenNow: isOpenNow,
            openingSoon: openingSoon,
            closingSoon: closingSoon,
        }
    } else {
        return {
            isOpenNow: true,
            openingSoon: false,
            closingSoon: false,
        }
    }
}

function getTodayWeekday() {
    const weekday = DateTime.now().toUTC().setZone(AMERICA_CHICAGO).weekday
    if(weekday == 7) return 0
    return weekday
}

function checkIsToday(dayDigit) {
    const todayDigit = getTodayWeekday()
    return todayDigit === dayDigit
}

/**
 *  Checks if array of closed dates includes today 
 * 
 *  @param {array} closedDates - List of dates in ISO format (i.e. yyyy-MM-dd) when site is exceptionally closed (e.g. holidays, spring break) 
 */
function checkIsClosedToday(closedDates) {
    const today = DateTime.now().toUTC().setZone(AMERICA_CHICAGO).toISODate()
    return closedDates.includes(today)
}

/**
 *  Checks if array of open dates includes today 
 * 
 *  @param {array} openDates - List of dates in ISO format (i.e. yyyy-MM-dd) when site is exceptionally closed (e.g. holidays, spring break) 
 */
 function checkIsOpenToday(openDates) {
    const today = DateTime.now().toUTC().setZone(AMERICA_CHICAGO).toISODate()
    return openDates.includes(today)
}

/**
 *  Checks if site is open 24 hours (if open and close are both midnight - site is open 24 hours)
 * 
 *  @param {string} open - 4-digit string of number from 0000 to 2359 representing open time
 *  @param {string} close - 4-digit string of number from 0000 to 2359 representing close time
 */
function check24Hours(open, close) {
    return (open === "0000" && close === "0000")
}

function checkIsOpenNow(openTime, closeTime, nowTime) {
    const isOvernightHours = closeTime < openTime
    const trueClosing = isOvernightHours ? closeTime.plus({ days: 1 }) : closeTime
    const hours = Interval.fromDateTimes(openTime, trueClosing)
    return hours.contains(nowTime)
}

function checkIsNearHoursStartOrEnd(time, nowTime) {
    const timeTil = time.diff(nowTime, 'hours')
    return 0 <= timeTil.hours && timeTil.hours <= 1
}