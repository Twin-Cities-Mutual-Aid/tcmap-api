jest.mock('airtable')
const { Settings, DateTime } = require("luxon")
const hoursUtils = require('./hoursUtils')

const testHours = require('../testData/hours_response.json')

describe('getHoursInfo', () => {
    test.each`
    openStatus        | hoursDescription        | date                             | is24Hours | isOpenNow  | openingSoon   | closingSoon | hours 
    ${"not open now"} | ${"has hours today"}    | ${Date.UTC(2021, 1, 25, 6, 10)}  | ${false}  | ${false}   | ${false}      | ${false}    | ${[{ openTime: "11:00AM", openTimeDigits: "1100", closeTime: "3:00PM", closeTimeDigits: "1500" }]}
    ${"not open now"} | ${"has hours today"}    | ${Date.UTC(2021, 1, 25, 6, 10)}  | ${false}  | ${true}   | ${false}      | ${false}    | ${[{ openTime: "11:00AM", openTimeDigits: "1100", closeTime: "3:00PM", closeTimeDigits: "1500" }, { openTime: "12:05AM", openTimeDigits: "0005", closeTime: "3:00AM", closeTimeDigits: "0300" }]}
    ${"open now"}     | ${"has hours today"}    | ${Date.UTC(2021, 1, 25, 17, 10)} | ${false}  | ${true}    | ${false}      | ${false}     | ${[{ openTime: "11:00AM", openTimeDigits: "1100", closeTime: "3:00PM", closeTimeDigits: "1500" }]}
    ${"open now"}     | ${"has hours today"}    | ${Date.UTC(2021, 1, 25, 20, 59)} | ${false}  | ${true}    | ${false}      | ${true}      | ${[{ openTime: "11:00AM", openTimeDigits: "1100", closeTime: "3:00PM", closeTimeDigits: "1500" }]}
    ${"not open now"} | ${"has hours today"}    | ${Date.UTC(2021, 1, 25, 16, 10)} | ${false}  | ${false}   | ${true}       | ${false}     | ${[{ openTime: "11:00AM", openTimeDigits: "1100", closeTime: "3:00PM", closeTimeDigits: "1500" }]}
    ${"not open now"} | ${"has hours today"}    | ${Date.UTC(2021, 1, 26, 4, 10)}  | ${false}  | ${false}   | ${false}      | ${false}     | ${[{ openTime: "11:00AM", openTimeDigits: "1100", closeTime: "3:00PM", closeTimeDigits: "1500" }]}
    ${"not open now"} | ${"has no hours today"} | ${Date.UTC(2021, 1, 26, 20, 10)} | ${false}  | ${false}   | ${undefined}  | ${undefined} | ${[]} 
    ${"open now"}     | ${"has hours today"}    | ${Date.UTC(2021, 1, 25, 5, 10)}  | ${true}   | ${true}    | ${false}      | ${false}     | ${[{ openTime: "12:00AM", openTimeDigits: "0000", closeTime: "12:00PM", closeTimeDigits: "0000" }]} 
    ${"open now"}     | ${"has hours today"}    | ${Date.UTC(2021, 1, 28, 10, 59)} | ${true}   | ${true}    | ${false}      | ${false}     | ${[{ openTime: "12:00AM", openTimeDigits: "0000", closeTime: "12:00PM", closeTimeDigits: "0000" }]} 
    `('should return site as $openStatus when site "$hoursDescription" and is $openStatus', ({date, is24Hours, isOpenNow, openingSoon, closingSoon, hours}) => {
        Settings.now = () => date

        const expectedResult = {
            isOpenNow: isOpenNow,
            openingSoon: openingSoon,
            closingSoon: closingSoon
        }
        const result = hoursUtils.getHoursInfo(hours, is24Hours)
        expect(result).toStrictEqual(expectedResult)
    })
})

describe('getSchedule', () => {
    const openHours = [
        "recS2hDlNsJgG9Kqn",
        "recSpjdkWPkmzjc95",
        "recSpjdkWPkmzjc96",
        "recS2hDlNsJgG9Kqm",
        "rect49hsKqi2NLrO1",
        "rect49hsKqi2NLrO3"
    ]
    const closeHours = [
        "recSpjdkWPkmzjc95",
        "recSpjdkWPkmzjc96",
        "rect49hsKqi2NLrOx",
        "rect49hsKqi2NLrOZ",
        "rect49hsKqi2NLrO1",
        "rect49hsKqi2NLrO4"
    ]

    test.each`
        weekday        | date                             | expectedSchedule
        ${"Thursday"}  | ${Date.UTC(2021, 1, 25, 6, 10)}  | ${getExpectedSchedule()}
        ${"Thursday"}  | ${Date.UTC(2021, 1, 25, 17, 10)} | ${getExpectedSchedule()}
        ${"Thursday"}  | ${Date.UTC(2021, 1, 25, 20, 59)} | ${getExpectedSchedule()}
        ${"Thursday"}  | ${Date.UTC(2021, 1, 25, 16, 10)} | ${getExpectedSchedule()}
        ${"Thursday"}  | ${Date.UTC(2021, 1, 26, 4, 10)}  | ${getExpectedSchedule()}
        ${"Friday"}    | ${Date.UTC(2021, 1, 26, 20, 10)} | ${getExpectedSchedule(false, false, true)}
        ${"Wednesday"} | ${Date.UTC(2021, 1, 25, 5, 10)}  | ${getExpectedSchedule(true, false, false)}
        ${"Sunday"}    | ${Date.UTC(2021, 1, 28, 10, 59)} | ${getExpectedSchedule(false, false, false, false, true)}
    `('should return site scheduled hours when today is $weekday', ({weekday, date, expectedSchedule}) => {
        Settings.now = () => date

        const result = hoursUtils.getSchedule(openHours, closeHours, testHours)
        expect(result).toStrictEqual(expectedSchedule)
    })
})

describe('checkIsClosedToday', () => {
    test.each`
        description               | date                             | isClosed | closedDates
        ${"include today"}        | ${Date.UTC(2021, 1, 25, 6, 10)}  | ${true}  |  ${["2021-02-25", "2021-02-01"]}
        ${"include today"}        | ${Date.UTC(2021, 1, 25, 17, 10)} | ${true}  |  ${["2021-02-25"]}
        ${"include today"}        | ${Date.UTC(2021, 1, 26, 4, 10)}  | ${true}  |  ${["2021-02-25", "2021-02-01"]}
        ${"do not include today"} | ${Date.UTC(2021, 1, 26, 20, 10)} | ${false} |  ${["2021-02-25", "2021-02-01"]}
        ${"do not include today"} | ${Date.UTC(2021, 1, 25, 5, 10)}  | ${false} |  ${["2021-02-25", "2021-02-01"]}
        ${"do not include today"} | ${Date.UTC(2021, 1, 28, 10, 59)} | ${false} |  ${["2021-02-25", "2021-02-01"]}
        ${"have malformed date"}  | ${Date.UTC(2021, 1, 28, 10, 59)} | ${false} |  ${["2021-25-02", "02/25/2021", "2021-02"]}
        ${"are empty"}            | ${Date.UTC(2021, 1, 28, 10, 59)} | ${false} |  ${[]}
    `('should return site is closed $isClosed when closedDates $description', ({description, date, isClosed, closedDates}) => {
        Settings.now = () => date

        const result = hoursUtils.checkIsClosedToday(closedDates)
        expect(result).toStrictEqual(isClosed)
    })
})

describe('checkIsOpenToday', () => {
    test.each`
        description               | date                             | isOpen   | openDates
        ${"include today"}        | ${Date.UTC(2021, 1, 25, 6, 10)}  | ${true}  |  ${["2021-02-25", "2021-02-01"]}
        ${"include today"}        | ${Date.UTC(2021, 1, 25, 17, 10)} | ${true}  |  ${["2021-02-25"]}
        ${"include today"}        | ${Date.UTC(2021, 1, 26, 4, 10)}  | ${true}  |  ${["2021-02-25", "2021-02-01"]}
        ${"do not include today"} | ${Date.UTC(2021, 1, 26, 20, 10)} | ${false} |  ${["2021-02-25", "2021-02-01"]}
        ${"do not include today"} | ${Date.UTC(2021, 1, 25, 5, 10)}  | ${false} |  ${["2021-02-25", "2021-02-01"]}
        ${"do not include today"} | ${Date.UTC(2021, 1, 28, 10, 59)} | ${false} |  ${["2021-02-25", "2021-02-01"]}
        ${"have malformed date"}  | ${Date.UTC(2021, 1, 28, 10, 59)} | ${false} |  ${["2021-25-02", "02/25/2021", "2021-02"]}
        ${"are empty"}            | ${Date.UTC(2021, 1, 28, 10, 59)} | ${false} |  ${[]}
    `('should return site is open $isOpen when openDates $description', ({description, date, isOpen, openDates}) => {
        Settings.now = () => date

        const result = hoursUtils.checkIsOpenToday(openDates)
        expect(result).toStrictEqual(isOpen)
    })
})

describe('transformHours', () => {
    test.each`
        resultDesc                | timeDesc     | time           | expectedResult                          
        ${"formatted 12hour time"}| ${"morning"} | ${"1000"}      | ${["10:00AM"]}    
        ${"formatted 12hour time"}| ${"evening"} | ${"1900"}      | ${["7:00PM"]}    
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
        ${Date.UTC(2021, 1, 28, 6, 0)}   | ${0}
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

function getExpectedSchedule(
    wednesdayIsToday = false,
    thursdayIsToday = true,
    fridayIsToday = false,
    saturdayIsToday = false,
    sundayIsToday = false,
    mondayIsToday = false,
    tuesdayIsToday = false
) {
    return [
        {
            day: 'sunday',
            dayDigit: 0,
            hours: [
                {
                    openTime: '12:00AM',
                    openTimeDigits: '0000',
                    closeTime: '12:00AM',
                    closeTimeDigits: '0000',
                },
            ],
            is24Hours: true,
            isToday: sundayIsToday,
        },
        {
            day: 'monday',
            dayDigit: 1,
            hours: [
                {
                    openTime: '11:00AM',
                    openTimeDigits: '1100',
                    closeTime: '3:00PM',
                    closeTimeDigits: '1500',
                },
                {
                    openTime: '5:00PM',
                    openTimeDigits: '1700',
                    closeTime: '7:00PM',
                    closeTimeDigits: '1900',
                },
            ],
            is24Hours: false,
            isToday: mondayIsToday,
        },
        {
            day: 'tuesday',
            dayDigit: 2,
            hours: [
                {
                    openTime: '12:00AM',
                    openTimeDigits: '0000',
                    closeTime: '12:00AM',
                    closeTimeDigits: '0000',
                },
            ],
            is24Hours: true,
            isToday: tuesdayIsToday,
        },
        {
            day: 'wednesday',
            dayDigit: 3,
            hours: [
                {
                    openTime: '12:00AM',
                    openTimeDigits: '0000',
                    closeTime: '12:00AM',
                    closeTimeDigits: '0000',
                },
            ],
            is24Hours: true,
            isToday: wednesdayIsToday,
        },
        {
            day: 'thursday',
            dayDigit: 4,
            hours: [
                {
                    openTime: '11:00AM',
                    openTimeDigits: '1100',
                    closeTime: '3:00PM',
                    closeTimeDigits: '1500',
                },
            ],
            is24Hours: false,
            isToday: thursdayIsToday,
        },
        {
            day: 'friday',
            dayDigit: 5,
            hours: [],
            is24Hours: false,
            isToday: fridayIsToday,
        },
        {
            day: 'saturday',
            dayDigit: 6,
            hours: [],
            is24Hours: false,
            isToday: saturdayIsToday,
        }
    ]
}