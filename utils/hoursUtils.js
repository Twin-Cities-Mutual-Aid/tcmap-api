const { DateTime, Interval } = require("luxon")


module.exports = {
    
    getHoursInfo: getHoursInfo,
    transformHours: transformHours,
    checkIsOpenNow: checkIsOpenNow
    
}

function getHoursInfo(periodsArray, hoursList) {
    const hoursRecords = periodsArray.map( id => hoursList.find(x => x.id == id))
    const hoursFields = hoursRecords.map(x => x.fields)
    const schedule = getSchedule(hoursFields)

    const todayDigit = DateTime.now().weekday
    const todayHours = hoursFields.find(period => period.open_weekday_digit == todayDigit)
    const hoursWindow = todayHours ? parseTodayHours(todayHours) : undefined

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

function getSchedule(hoursFields) {
    const formattedHours = hoursFields.map(field => 
        {
            return {
                weekdayDigit: field.open_weekday_digit,
                openTime: field.open_time,
                openTimeDigits: field.open_time_digits,
                closeTime: field.close_time,
                closeTimeDigits: field.close_time_digits,
            }
        }
    )

    return [
        getDaySchedule("sunday", 0, formattedHours),
        getDaySchedule("monday", 1, formattedHours),
        getDaySchedule("tuesday", 2, formattedHours),
        getDaySchedule("wednesday", 3, formattedHours),
        getDaySchedule("thursday", 4, formattedHours),
        getDaySchedule("friday", 5, formattedHours),
        getDaySchedule("saturday", 6, formattedHours)
    ]
}

function getDaySchedule(weekday, dayDigit, formattedHours) {
    const hours = (formattedHours.find( ({ weekdayDigit }) => weekdayDigit === dayDigit ) || undefined)
    let is24Hours = false
    if(hours) {
        is24Hours = check24Hours(hours.openTimeDigits, hours.closeTimeDigits)
    }

    return {
        day: weekday,
        dayDigit: dayDigit,
        openTime: hours ? hours.openTime : undefined,
        closeTime: hours ? hours.closeTime : undefined,
        is24Hours: is24Hours,
        isToday: checkIsToday(dayDigit),
    }
}

function parseTodayHours(todayHours) {
    const is24Hours = todayHours ? check24Hours(todayHours.open_time_digits, todayHours.close_time_digits) : false
    
    if (!is24Hours) {
        const openTime = todayHours.open_time_digits
        const closeTime = todayHours.close_time_digits
        const opening = DateTime.fromObject({hour: openTime.substring(0,2), minutes: openTime.substring(2,4), zone: 'America/Chicago'})
        const closing = DateTime.fromObject({hour: closeTime.substring(0,2), minutes: closeTime.substring(2,4), zone: 'America/Chicago'})
        const nowTime = DateTime.now()
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

function checkIsToday (dayDigit) {
    const todayDigit = DateTime.now().weekday
    return todayDigit === dayDigit
}

function check24Hours(open, close) {
    return (open && !close) ? true : false
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