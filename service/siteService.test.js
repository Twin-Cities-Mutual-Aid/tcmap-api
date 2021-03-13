const airtableClientMock = require('../airtableClient')
const cacheServiceMock = require('./cacheService')
const siteService = require('./siteService')
const { Settings } = require("luxon")

jest.mock('airtable')
jest.mock('../airtableClient')
jest.mock('./cacheService')

const testSites = require('../testData/sites_response.json')
const testHours = require('../testData/hours_response.json')

const expectedResult = [{ name: "10k Hoodies- Bloomington", neighborhood: ["South Suburbs"], address: "7843 Portland Ave S, Bloomington, MN 55420\n", longitude: -93.267299, latitude: 44.860555, mostRecentlyUpdatedAt: "2021-01-30T02:24:17.000Z", currentlyOpenForDistributing: "no", openingForDistributingDonations: "never", closingForDistributingDonations: undefined, currentlyOpenForReceiving: "yes", openingForReceivingDonations: "9:00AM", closingForReceivingDonations: "5:00PM", urgentNeed: undefined, seekingMoney: undefined, seekingMoneyURL: undefined, noIdNeeded: undefined, someInfoRequired: undefined, warmingSite: undefined, publicTransitOptions: undefined, accepting: "(as of 12/24 10:20am) Hoodies, new and packaged personal hygiene products. If you are able, please attach a small and encouraging handwritten note to the hoodie that you are donating.", notAccepting: undefined, seekingVolunteers: "no", notes: "(as of 12/24 10:20am)\nBring a hoodie to Pilgrims Dry Cleaners \nMonday - Friday 7am - 7pm \nSaturday 9am - 5pm\nSunday 10am - 5pm\n\nYou can also ship a hoodie to\nATTN:\nBrandon Glova\nPO\nBox 8112\nMinneapolis,\nMN 55408-3103 \n\nYou may also support 10khoodies by purchasing a hoodie at https://highlovelife.com/pages/10khoodies\n\nOne year ago, DJ Bonics started a mission to turn Minnesota from the land of 10,000 Lakes to the Land of 10,000 Hoodies. The year 2020 has been met with many challenges and opportunities to grow. This project serves as a reminder that we all have something to give. By donating a sweatshirt, you are providing someone in your community with warmth and comfort that lasts beyond a Minnesota winter.", color: "#fc03df" }, 
        { name: "10k Hoodies- Brooklyn Park", neighborhood: ["North Suburbs"], address: "3217 85th Ave N, Brooklyn Park, MN 55443\n", longitude: -93.3232077, latitude: 45.1083272, mostRecentlyUpdatedAt: "2021-01-30T02:24:24.000Z", currentlyOpenForDistributing: "no", openingForDistributingDonations: "never", closingForDistributingDonations: undefined, currentlyOpenForReceiving: "yes", openingForReceivingDonations: "11:00AM", closingForReceivingDonations: "3:00PM", urgentNeed: undefined, seekingMoney: undefined, seekingMoneyURL: undefined, noIdNeeded: undefined, someInfoRequired: undefined, warmingSite: undefined, seekingVolunteers: undefined, publicTransitOptions: [{ routeName: "89", backgroundColor: "#771473", icon: "directions_bus", distance: "(3 blocks)", altText: "89 bus, (3 blocks) away" }, { routeName: "Blue", backgroundColor: "#0055A5", icon: "tram", distance: "(2 blocks)", altText: "BLUELINE light rail, (2 blocks) away" }, { routeName: "Green", backgroundColor: "#00B100", icon: "tram", distance: "(4 blocks)", altText: "GREENLINE light rail, (4 blocks) away" }], accepting: "(as of 12/24 10:20am) Hoodies, new and packaged personal hygiene products. If you are able, please attach a small and encouraging handwritten note to the hoodie that you are donating.", notAccepting: undefined, notes: "(as of 12/24 10:20am)\nBring a hoodie to Pilgrims Dry Cleaners \nMonday - Friday 7am - 6pm\nSaturday 9am - 3pm\n\nYou can also ship a hoodie to\n \nATTN:\nBrandon Glova\nPO\nBox 8112\nMinneapolis,\nMN 55408-3103 \n\nYou may also support 10khoodies by purchasing a hoodie at https://highlovelife.com/pages/10khoodies \n\nOne year ago, DJ Bonics started a mission to turn Minnesota from the land of 10,000 Lakes to the Land of 10,000 Hoodies. The year 2020 has been met with many challenges and opportunities to grow. This project serves as a reminder that we all have something to give. By donating a sweatshirt, you are providing someone in your community with warmth and comfort that lasts beyond a Minnesota winter. ", color: "#fc03df" }]





describe("getMutualAidSites", () => {
    afterEach(() => jest.resetAllMocks());

    it('should return all properties accurately mapped', async () => {
        Settings.now = () => new Date(2021, 1, 25, 12, 10).valueOf()

        airtableClientMock.getMutualAidSites.mockResolvedValue(testSites)
        airtableClientMock.getHours.mockResolvedValue(testHours)

        let result = await siteService.getMutualAidSites("/v1/mutual_aid_sites")

        expect(airtableClientMock.getMutualAidSites).toHaveBeenCalled()
        expect(cacheServiceMock.writeCache).toHaveBeenCalled()

        expect(result).toStrictEqual(expectedResult)
    })

    it('should return cached result when airtableClient throws error getting sites', async () => {
        cacheServiceMock.readCache.mockResolvedValue(expectedResult)
        airtableClientMock.getMutualAidSites.mockResolvedValue(new Error("There was an error getting mutual aid sites: Error fetching Airtable records"))

        let result = await siteService.getMutualAidSites("/v1/mutual_aid_sites")

        expect(cacheServiceMock.readCache).toHaveBeenCalled()
        expect(result).toStrictEqual(expectedResult)
    })

    it('should return cached result when airtableClient throws error getting hours', async () => {
        cacheServiceMock.readCache.mockResolvedValue(expectedResult)
        airtableClientMock.getHours.mockResolvedValue(new Error("There was an error getting hours: Error fetching Airtable records"))

        let result = await siteService.getMutualAidSites("/v1/mutual_aid_sites")

        expect(cacheServiceMock.readCache).toHaveBeenCalled()
        expect(result).toStrictEqual(expectedResult)
    })

    it('should return cached result when error thrown from within function', async () => {
        cacheServiceMock.readCache.mockResolvedValue(expectedResult)
        cacheServiceMock.writeCache.mockResolvedValue(new Error("There was an error mapping mutual aid sites, returning cached data. Error is: write to cache failed"))

        let result = await siteService.getMutualAidSites("/v1/mutual_aid_sites")

        expect(cacheServiceMock.readCache).toHaveBeenCalled()
        expect(result).toStrictEqual(expectedResult)
    })
})

describe("transformPublicTransit", () => {
    it('should return list of publicTransitOption objects', () => {
        let result = siteService.transformPublicTransit([ "89-BUS-(3 blocks)", "Blue-BLUELINE-(2 blocks)", "Green-GREENLINE-(4 blocks)" ])
        let expectedResult = [ { routeName: "89", backgroundColor: "#771473", icon: "directions_bus", distance: "(3 blocks)", altText: "89 bus, (3 blocks) away" }, { routeName: "Blue", backgroundColor: "#0055A5", icon: "tram", distance: "(2 blocks)", altText: "BLUELINE light rail, (2 blocks) away" }, { routeName: "Green", backgroundColor: "#00B100", icon: "tram", distance: "(4 blocks)", altText: "GREENLINE light rail, (4 blocks) away" } ]
        expect(result).toStrictEqual(expectedResult)
    })

    it('should ignore transit options with less than two hyphens', () => {
        let result = siteService.transformPublicTransit([ "89BUS(3 blocks)", "BlueBLUELINE-(2 blocks)", "Green-GREENLINE-(4 blocks)" ])
        expect(result.length).toBe(1)
    })

    it('should ignore transit options with invalid transit type', () => {
        let result = siteService.transformPublicTransit([ "89-BUSSES-(3 blocks)", "Blue-TRAIN-(2 blocks)", "Green-greenline-(4 blocks)" ])
        expect(result).toBe(undefined)
    })
})

describe("getWarmingSiteStatus", () => {
    it('should return true when automate_warming_site_status checkbox is checked and site is currently open for distributing', () => {
        let result = siteService.getWarmingSiteStatus(true, "yes", undefined)
        expect(result).toStrictEqual(true)
    })

    it('should return true when automate_warming_site_status checkbox is unchecked (undefined) and warming_site checkbox is checked', () => {
        let result = siteService.getWarmingSiteStatus(undefined, "yes", true)
        expect(result).toStrictEqual(true)
    })

    it('should return undefined when automate_warming_site_status checkbox is checked and site is not currently open for distributing', () => {
        let result = siteService.getWarmingSiteStatus(true, "no", undefined)
        expect(result).toStrictEqual(undefined)
    })

    it('should return undefined when automate_warming_site_status checkbox is unchecked (undefined) and warming_site checkbox is not checked (undefined)', () => {
        let result = siteService.getWarmingSiteStatus(undefined, "yes", undefined)
        expect(result).toStrictEqual(undefined)
    })
})