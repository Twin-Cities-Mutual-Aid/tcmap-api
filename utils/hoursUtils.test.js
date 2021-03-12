jest.mock('airtable')
const { Settings, DateTime } = require("luxon")
const hoursUtils = require('./hoursUtils')

const testHours = require('../testData/hours_response.json')


const expectedHours = {
    hours: [
        {
            day: 'sunday',
            dayDigit: 0,
            openTime: undefined,
            closeTime: undefined,
            is24Hours: false,
            isToday: false,
        },
        {
            day: 'monday',
            dayDigit: 1,
            openTime: '11:00AM',
            closeTime: '3:00PM',
            is24Hours: false,
            isToday: false,
        },
        {
            day: 'tuesday',
            dayDigit: 2,
            openTime: '12:00AM',
            closeTime: '12:00AM',
            isToday: false,
            is24Hours: true,
        },
        {
            day: 'wednesday',
            dayDigit: 3,
            openTime: '12:00AM',
            closeTime: '12:00AM',
            isToday: false,
            is24Hours: true,
        },
        {
            day: 'thursday',
            dayDigit: 4,
            openTime: '11:00AM',
            closeTime: '3:00PM',
            isToday: true,
            is24Hours: false,
        },
        {
            day: 'friday',
            dayDigit: 5,
            openTime: undefined,
            closeTime: undefined,
            isToday: false,
            is24Hours: false,
        },
        {
            day: 'saturday',
            dayDigit: 6,
            openTime: undefined,
            closeTime: undefined,
            isToday: false,
            is24Hours: false,
        }
    ]
}

describe('getHoursInfo', () => {
    const periodsArray = [
        "recmmC9oshIcu35c3",
        "reczWnecVFbJ5GN4R",
        "rec3nv0GVDNPQzs32",
        "recuq0G9dcDh0fIFS"
    ]

    // ${"not open now"} | ${"has no hours today"} | ${'2021-02-26T16:01:58.135Z'} | ${false}   | ${undefined}    | ${undefined}
    test.each`
    openStatus        | hours                   | date                          | isOpenNow  | openingSoon     | closingSoon
    ${"open now"}     | ${"has hours today"}    | ${new Date(2021, 1, 25, 12, 10)} | ${true}    | ${false}        | ${false}
    ${"open now"}     | ${"has hours today"}    | ${new Date(2021, 1, 25, 14, 59)} | ${true}    | ${false}        | ${true}
    ${"not open now"} | ${"has hours today"}    | ${new Date(2021, 1, 25, 10, 10)} | ${false}   | ${true}         | ${false}
    `('should return site as $openStatus with summary when site "$hours" and is $openStatus', ({date, isOpenNow, openingSoon, closingSoon}) => {
        Settings.now = () => date.valueOf()
        console.log(DateTime.now().toLocaleString(DateTime.DATETIME_FULL))

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
        const openTime = DateTime.fromObject({hour: openHours, minutes: openMinutes, zone: 'America/Chicago'})
        const closeTime = DateTime.fromObject({hour: closeHours, minutes: closeMinutes, zone: 'America/Chicago'})
        let now = DateTime.fromObject({hour: nowHours, minutes: nowMinutes, zone: 'America/Chicago'})
        now = nextDay ? now.plus({day: 1}) : now

        let result = hoursUtils.checkIsOpenNow(openTime, closeTime, now)
        expect(result).toStrictEqual(expectedResult)
    })
})