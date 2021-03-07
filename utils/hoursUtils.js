const airtableClient = require('../airtableClient')


module.exports = {
    
    getHoursInfo: getHoursInfo,
    transformHours: transformHours,
    checkIsOpenNow: checkIsOpenNow
    
}

function getHoursInfo(periodsArray, hoursList) {
    const hoursRecords = periodsArray.map( id => hoursList.find(x => x.id == id))
    const hoursFields = hoursRecords.map(x => x.fields)
    const hoursSummary = getHoursSummary(hoursFields)

    const datetimeNow = getDatetimeNow()
    const todayDigit = datetimeNow.getDay()
    const todayHours = hoursFields.find(period => period.open_weekday_digit == todayDigit)
    const hoursWindow = todayHours ? parseTodayHours(todayHours, datetimeNow) : undefined

    if(hoursWindow) {
        return {
            ...hoursWindow,
            hours: hoursSummary
        }
    } else {
        return {
            isOpenNow: false,
            openingSoon: undefined,
            closingSoon: undefined,
            hours: hoursSummary
        }
    }
}

function transformHours(time) {
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

function getHoursSummary(hoursFields) {
    const formattedHours = hoursFields.map(field => 
        {
            const closeTimeDigits = field.close_time_digits
            const hoursObject = {
                day: field.open_weekday,
                day_digit: field.open_weekday_digit,
                openTime: field.open_time,
                open_time_digits: field.open_time_digits,
                closeTime: field.close_time,
                close_time_digits: closeTimeDigits ? closeTimeDigits : undefined,
                hoursSummary: closeTimeDigits ? `${field.open_time} - ${field.close_time}` : "Open 24 hours"
            }
            return hoursObject
        }
    )

    const weeklySchedule = [
        getDaySchedule("sunday", 0, formattedHours),
        getDaySchedule("monday", 1, formattedHours),
        getDaySchedule("tuesday", 2, formattedHours),
        getDaySchedule("wednesday", 3, formattedHours),
        getDaySchedule("thursday", 4, formattedHours),
        getDaySchedule("friday", 5, formattedHours),
        getDaySchedule("saturday", 6, formattedHours)
    ]
    return weeklySchedule

}

function getDaySchedule(weekday, dayDigit, formattedHours) {
    const hours = (formattedHours.find( ({ day_digit }) => day_digit === dayDigit ) || {})

    return {
        day: weekday,
        dayDigit: dayDigit,
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        isToday: checkIsToday(dayDigit),
        hoursSummary: hours.hoursSummary || "Closed"
    }
}

function checkIsToday (dayDigit) {
    const todayDigit = getDatetimeNow().getDay()
    return todayDigit === dayDigit
}

function parseTodayHours(todayHours, datetime) {
    const opening = todayHours.open_time_digits
    const closing = todayHours.close_time_digits
    
    const nowHours = addZero(datetime.getHours())
    const nowMinutes = addZero(datetime.getMinutes())
    const nowTime = nowHours + "" + nowMinutes

    const isOpenNow = checkIsOpenNow(opening, closing, nowTime)
    const openingSoon = checkIsOpeningSoon(opening, nowTime)
    const closingSoon = checkIsClosingSoon(closing, nowTime)
    return {
        isOpenNow: isOpenNow,
        openingSoon: openingSoon,
        closingSoon: closingSoon,
    }
}

function checkIsOpenNow(opening, closing, nowTime) {
    const isOvernightHours = (closing - opening < 0) ? true : false
    if (isOvernightHours) {
        return (opening <= nowTime && nowTime <= 2359) || (0 <= nowTime && nowTime < closing)
    }
    return !closing ? true : (opening <= nowTime && nowTime < closing)
}

function checkIsOpeningSoon(opening, nowTime) {
    const timeTilOpen = opening - nowTime
    return (0 <= timeTilOpen && timeTilOpen <= 100 )
}

function checkIsClosingSoon(closing, nowTime) {
    const timeTilClose = closing - nowTime
    return (0 <= timeTilClose && timeTilClose <= 100 )
}

function getDatetimeNow() {
    const mplsDatetime = new Date(Date.now()).toLocaleString("en-US", {timeZone: "America/Chicago"})
    return new Date(mplsDatetime)
}

function addZero(num) {
    return num < 10 ? "0" + num : num
}