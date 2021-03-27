const { DateTime, Interval } = require("luxon")

const AMERICA_CHICAGO = "America/Chicago"


module.exports = {
    
    getHoursInfo: getHoursInfo,
    transformHours: transformHours,
    getTodayWeekday: getTodayWeekday,
    checkIsOpenNow: checkIsOpenNow
    
}

function getHoursInfo(periodsArray, openHours, closeHours, hoursList, timesList) {
    const openHoursRecords = openHours.map( id => hoursList.find(x => x.id == id))
    const openHoursFields = openHoursRecords.map(x => x.fields)
    const closeHoursRecords = closeHours.map( id => hoursList.find(x => x.id == id))
    const closeHoursFields = closeHoursRecords.map(x => x.fields)

    // TODO - Remove
    // const hoursRecords = periodsArray.map( id => hoursList.find(x => x.id == id))
    // const hoursFields = hoursRecords.map(x => x.fields)
    //

    // const schedule = getSchedule(hoursFields, openHoursFields, closeHoursFields)
    const schedule = getSchedule(openHoursFields, closeHoursFields)

    const todayDigit = getTodayWeekday()

    // const todayHours = hoursFields.find(period => period.open_weekday_digit == todayDigit)
    const todayOpenHours = openHoursFields.find(period => period.weekday_digit == todayDigit)
    const todayCloseHours = closeHoursFields.find(period => period.weekday_digit == todayDigit)
    const hoursWindow = (todayOpenHours && todayCloseHours) ? parseTodayHours(todayOpenHours, todayCloseHours) : undefined

    if(hoursWindow) {
        return {
            ...hoursWindow,
            hours: schedule
        }
    } else {
        return {
            isOpenNow: false,
            openingSoon: undefined,
            closingSoon: undefined,
            hours: schedule
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


// function getSchedule(hoursFields, openHoursFields, closeHoursFields) {
function getSchedule(openHoursFields, closeHoursFields) {

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

    // console.log(openHours)
    // console.log(closeHours)


    const formattedHours = []

    // const formattedHours = hoursFields.map(field => 
    //     {
    //         return {
    //             weekdayDigit: field.open_weekday_digit,
    //             openTime: field.open_time,
    //             openTimeDigits: field.open_time_digits, // 4-digit string of number from 0000 to 2359
    //             closeTime: field.close_time,
    //             closeTimeDigits: field.close_time_digits, // 4-digit string of number from 0000 to 2359
    //         }
    //     }
    // )

    return [
        getDaySchedule("sunday", 0, formattedHours, openHours, closeHours),
        getDaySchedule("monday", 1, formattedHours, openHours, closeHours),
        getDaySchedule("tuesday", 2, formattedHours, openHours, closeHours),
        getDaySchedule("wednesday", 3, formattedHours, openHours, closeHours),
        getDaySchedule("thursday", 4, formattedHours, openHours, closeHours),
        getDaySchedule("friday", 5, formattedHours, openHours, closeHours),
        getDaySchedule("saturday", 6, formattedHours, openHours, closeHours)
    ]
}

function getDaySchedule(weekday, dayDigit, formattedHours, formattedOpenHours, formattedCloseHours) {
    const openHours = (formattedOpenHours.find( ({ weekdayDigit }) => weekdayDigit === dayDigit ) || undefined)
    const closeHours = (formattedCloseHours.find( ({ weekdayDigit }) => weekdayDigit === dayDigit ) || undefined)
    // const hours = (formattedHours.find( ({ weekdayDigit }) => weekdayDigit === dayDigit ) || undefined)
    let is24Hours = false
    // if(hours) {
    //     is24Hours = check24Hours(hours.openTimeDigits, hours.closeTimeDigits)
    // }
    if(openHours && closeHours) {
        is24Hours = check24Hours(openHours.timeDigits, closeHours.timeDigits)
    }

    return {
        day: weekday,
        dayDigit: dayDigit,
        // openTime: hours ? hours.openTime : undefined,
        openTime: openHours ? openHours.time : undefined,
        // closeTime: hours ? hours.closeTime : undefined,
        closeTime: closeHours ? closeHours.time : undefined,
        is24Hours: is24Hours,
        isToday: checkIsToday(dayDigit),
    }
}

function parseTodayHours(todayOpenHours, todayCloseHours) {
    // const is24Hours = todayHours ? check24Hours(todayHours.open_time_digits, todayHours.close_time_digits) : false
    const is24Hours = check24Hours(todayOpenHours.time_digits, todayCloseHours.time_digits)
    
    if (!is24Hours) {
        // const openTime = todayHours.open_time_digits
        const openTime = todayOpenHours.time_digits
        // const closeTime = todayHours.close_time_digits
        const closeTime = todayCloseHours.time_digits
        const opening = DateTime.fromObject({hour: openTime.substring(0,2), minutes: openTime.substring(2,4), zone: AMERICA_CHICAGO}).toUTC()
        console.log("Opening")
        console.log(opening)
        const closing = DateTime.fromObject({hour: closeTime.substring(0,2), minutes: closeTime.substring(2,4), zone: AMERICA_CHICAGO}).toUTC()
        console.log("Closing")
        console.log(closing)
        const nowTime = DateTime.now().toUTC()
        console.log("now")
        console.log(nowTime)
        // console.log(nowTime.toLocaleString(DateTime.DATETIME_FULL))
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
    return DateTime.now().toUTC().setZone(AMERICA_CHICAGO).weekday
}

function checkIsToday(dayDigit) {
    const todayDigit = getTodayWeekday()
    return todayDigit === dayDigit
}

function check24Hours(open, close) {
    // return (open && !close) ? true : false
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