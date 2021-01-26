const Airtable = require('airtable');

const siteService = require('./siteService')

describe("siteService tests", () => {
    test('transforming list of public transit option strings returns list of publicTransitOption objects', () => {
        let result = siteService.transformPublcTransit([ "89-BUS-(3 blocks)", "Blue-BLUELINE-(2 blocks)", "Green-GREENLINE-(4 blocks)" ])
        let expectedResult = [ { routeName: "89", backgroundColor: "#771473", icon: "directions_bus", distance: "(3 blocks)" }, { routeName: "Blue", backgroundColor: "#0055A5", icon: "tram", distance: "(2 blocks)" }, { routeName: "Green", backgroundColor: "#00B100", icon: "tram", distance: "(4 blocks)" } ]
        expect(result).toBe(expectedResult)
    })
})