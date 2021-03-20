jest.mock('airtable')
const { Settings, DateTime } = require("luxon")
const hoursUtils = require('./hoursUtils')

const testHours = require('../testData/hours_response.json')

describe('getHoursInfo', () => {
    const periodsArray = [
        "recmmC9oshIcu35c3",
        "reczWnecVFbJ5GN4R",
        "rec3nv0GVDNPQzs32",
        "recuq0G9dcDh0fIFS"
    ]

    test.each`
    openStatus        | hours                   | date                             | isOpenNow  | openingSoon  | closingSoon  | expectedHours
    ${"not open now"} | ${"has hours today"}    | ${Date.UTC(2021, 1, 25, 6, 10)}  | ${false}   | ${false}     | ${false}     | ${getExpectedHours()}
    ${"open now"}     | ${"has hours today"}    | ${Date.UTC(2021, 1, 25, 17, 10)} | ${true}    | ${false}     | ${false}     | ${getExpectedHours()}
    ${"open now"}     | ${"has hours today"}    | ${Date.UTC(2021, 1, 25, 20, 59)} | ${true}    | ${false}     | ${true}      | ${getExpectedHours()}
    ${"not open now"} | ${"has hours today"}    | ${Date.UTC(2021, 1, 25, 16, 10)} | ${false}   | ${true}      | ${false}     | ${getExpectedHours()}
    ${"not open now"} | ${"has hours today"}    | ${Date.UTC(2021, 1, 26, 4, 10)}  | ${false}   | ${false}     | ${false}     | ${getExpectedHours()}
    ${"not open now"} | ${"has no hours today"} | ${Date.UTC(2021, 1, 26, 20, 10)} | ${false}   | ${undefined} | ${undefined} | ${getExpectedHours(false, false, true)}
    ${"not open now"} | ${"has hours today"}    | ${Date.UTC(2021, 1, 25, 5, 10)}  | ${true}    | ${false}     | ${false}      | ${getExpectedHours(true, false, false)}
    `('should return site as $openStatus with summary when site "$hours" and is $openStatus', ({date, isOpenNow, openingSoon, closingSoon, expectedHours}) => {
        Settings.now = () => date

        const expectedResult = {
            isOpenNow: isOpenNow,
            openingSoon: openingSoon,
            closingSoon: closingSoon,
            ...expectedHours
        }
        const result = hoursUtils.getHoursInfo(periodsArray, testHours)
        expect(result).toStrictEqual(expectedResult)
    })
})

describe('transformHours', () => {
    test.each`
        resultDesc                | timeDesc     | time           | expectedResult                          
        ${"formatted 12hour time"}| ${"morning"} | ${"1000"}      | ${"10:00AM"}    
        ${"formatted 12hour time"}| ${"evening"} | ${"1900"}      | ${"7:00PM"}    
        ${"not today"}            | ${"not"}     | ${"not today"} | ${"not today"}    
    `('should return $resultDesc when time is $timeDesc number', ({time, expectedResult}) => {
        let result = hoursUtils.transformHours(time)
        expect(result).toStrictEqual(expectedResult)
    })
})

describe('getTodayWeekday', () => {
    test.each`
    date                             | weekday 
    ${Date.UTC(2021, 1, 25, 0, 10)}  | ${3} 
    ${Date.UTC(2021, 1, 25, 6, 0)}   | ${4} 
    ${Date.UTC(2021, 1, 25, 16, 10)} | ${4}
    ${Date.UTC(2021, 1, 25, 23, 59)} | ${4}
    ${Date.UTC(2021, 1, 26, 4, 59)}  | ${4}
    ${Date.UTC(2021, 1, 26, 6, 0)}   | ${5}
    `('should return weekday as $weekday when todays date is $date', ({date, weekday}) => {
        Settings.now = () => date

        const result = hoursUtils.getTodayWeekday()
        expect(result).toStrictEqual(weekday)
    })
})

describe('checkIsOpenNow', () => {
    test.each`
        openHours | openMinutes | closeHours | closeMinutes | nowHours | nowMinutes | nextDay  | expectedResult                          
        ${"11"}   | ${"00"}     | ${"15"}    | ${"00"}      | ${"13"}  | ${"00"}    | ${false} | ${true}    
        ${"18"}   | ${"00"}     | ${"09"}    | ${"00"}      | ${"00"}  | ${"00"}    | ${true}  | ${true}    
        ${"18"}   | ${"00"}     | ${"09"}    | ${"00"}      | ${"17"}  | ${"59"}    | ${false} | ${false}    
        ${"00"}   | ${"00"}     | ${"12"}    | ${"00"}      | ${"06"}  | ${"00"}    | ${false} | ${true}    
        ${"16"}   | ${"00"}     | ${"10"}    | ${"00"}      | ${"23"}  | ${"59"}    | ${false} | ${true}    
        ${"16"}   | ${"00"}     | ${"10"}    | ${"00"}      | ${"10"}  | ${"00"}    | ${true}  | ${false}    
        ${"06"}   | ${"00"}     | ${"20"}    | ${"00"}      | ${"20"}  | ${"00"}    | ${false} | ${false}    
    `('should return $expectedResult when opening time is $openHours$openMinutes, closing time is $closeHours$closeMinutes and now is $nowHours$nowMinutes', ({openHours, openMinutes, closeHours, closeMinutes, nowHours, nowMinutes, nextDay, expectedResult}) => {
        const openTime = DateTime.fromObject({hour: openHours, minutes: openMinutes, zone: "America/Chicago"}).toUTC()
        const closeTime = DateTime.fromObject({hour: closeHours, minutes: closeMinutes, zone: "America/Chicago"}).toUTC()
        let now = DateTime.fromObject({hour: nowHours, minutes: nowMinutes, zone: "America/Chicago"})
        now = nextDay ? now.plus({day: 1}).toUTC() : now.toUTC()

        let result = hoursUtils.checkIsOpenNow(openTime, closeTime, now)
        expect(result).toStrictEqual(expectedResult)
    })
})

function getExpectedHours(
    wednesdayIsToday = false,
    thursdayIsToday = true,
    fridayIsToday = false,
    saturdayIsToday = false,
    sundayIsToday = false,
    mondayIsToday = false,
    tuesdayIsToday = false
) {
    return {
        hours: [
            {
                day: 'sunday',
                dayDigit: 0,
                openTime: undefined,
                closeTime: undefined,
                is24Hours: false,
                isToday: sundayIsToday,
            },
            {
                day: 'monday',
                dayDigit: 1,
                openTime: '11:00AM',
                closeTime: '3:00PM',
                is24Hours: false,
                isToday: mondayIsToday,
            },
            {
                day: 'tuesday',
                dayDigit: 2,
                openTime: '12:00AM',
                closeTime: '12:00AM',
                is24Hours: true,
                isToday: tuesdayIsToday,
            },
            {
                day: 'wednesday',
                dayDigit: 3,
                openTime: '12:00AM',
                closeTime: '12:00AM',
                is24Hours: true,
                isToday: wednesdayIsToday,
            },
            {
                day: 'thursday',
                dayDigit: 4,
                openTime: '11:00AM',
                closeTime: '3:00PM',
                is24Hours: false,
                isToday: thursdayIsToday,
            },
            {
                day: 'friday',
                dayDigit: 5,
                openTime: undefined,
                closeTime: undefined,
                is24Hours: false,
                isToday: fridayIsToday,
            },
            {
                day: 'saturday',
                dayDigit: 6,
                openTime: undefined,
                closeTime: undefined,
                is24Hours: false,
                isToday: saturdayIsToday,
            }
        ]
    }
}