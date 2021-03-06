const airtableMock = require('airtable')
jest.mock('airtable')
const hoursUtils = require('./hoursUtils')

const testHours = require('../testData/hours_response.json')


const expectedHours = {
    hours: [
        {
            day: 'sunday',
            dayDigit: 0,
            openTime: undefined,
            closeTime: undefined,
            isToday: false,
            hoursSummary: 'Closed'
        },
        {
            day: 'monday',
            dayDigit: 1,
            openTime: '11:00AM',
            closeTime: '3:00PM',
            isToday: false,
            hoursSummary: '11:00AM - 3:00PM'
        },
        {
            day: 'tuesday',
            dayDigit: 2,
            openTime: '12:00AM',
            closeTime: '12:00AM',
            isToday: false,
            hoursSummary: 'Open 24 hours'
        },
        {
            day: 'wednesday',
            dayDigit: 3,
            openTime: '12:00AM',
            closeTime: '12:00AM',
            isToday: false,
            hoursSummary: 'Open 24 hours'
        },
        {
            day: 'thursday',
            dayDigit: 4,
            openTime: '11:00AM',
            closeTime: '3:00PM',
            isToday: true,
            hoursSummary: '11:00AM - 3:00PM'
        },
        {
            day: 'friday',
            dayDigit: 5,
            openTime: undefined,
            closeTime: undefined,
            isToday: false,
            hoursSummary: 'Closed'
        },
        {
            day: 'saturday',
            dayDigit: 6,
            openTime: undefined,
            closeTime: undefined,
            isToday: false,
            hoursSummary: 'Closed'
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
        ${"open now"}     | ${"has hours today"}    | ${'2021-02-25T18:01:58.135Z'} | ${true}    | ${false}        | ${false}
        ${"open now"}     | ${"has hours today"}    | ${'2021-02-25T20:01:58.135Z'} | ${true}    | ${false}        | ${true}
        ${"not open now"} | ${"has hours today"}    | ${'2021-02-25T16:01:58.135Z'} | ${false}   | ${true}         | ${false}
    `('should return site as $openStatus with summary when site "$hours" and is $openStatus', ({date, isOpenNow, openingSoon, closingSoon}) => {
        useMockDate(date)

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
        ${"formatted 12hour time"}| ${"morning"} | ${"1000"}      | ${"10:00 am"}    
        ${"formatted 12hour time"}| ${"evening"} | ${"1900"}      | ${"7:00 pm"}    
        ${"not today"}            | ${"not"}     | ${"not today"} | ${"not today"}    
    `('should return $resultDesc when time is $timeDesc number', ({time, expectedResult}) => {
        let result = hoursUtils.transformHours(time)
        expect(result).toStrictEqual(expectedResult)

    })
})

describe('checkIsOpenNow', () => {
    test.each`
        openTime | closeTime    | nowTime | expectedResult                          
        ${1100}  | ${1500}      | ${1300} | ${true}    
        ${0}     | ${undefined} | ${1800} | ${true}    
        ${1800}  | ${900}       | ${0}    | ${true}    
        ${1800}  | ${900}       | ${1759} | ${false}    
        ${0}     | ${1200}      | ${600}  | ${true}    
        ${1600}  | ${1000}      | ${2359} | ${true}    
        ${1600}  | ${1000}      | ${1000} | ${false}    
        ${600}   | ${2000}      | ${2000} | ${false}    
    `('should return $expectedResult when opening time is $openTime, closing time is $closeTime and now is $nowTime', ({openTime, closeTime, nowTime, expectedResult}) => {
        let result = hoursUtils.checkIsOpenNow(openTime, closeTime, nowTime)
        expect(result).toStrictEqual(expectedResult)
    })
})

useMockDate = function(date) {
    jest
        .spyOn(global.Date, 'now')
        .mockImplementation(() => new Date(date).valueOf())
}