# TCMAP API

This is the backend API that serves json data from Airtable to the [TCMAP UI](https://twin-cities-mutual-aid.org/) - a webapp to coordinate aid and care in the Twin Cities.
This API uses file-based caching and [Bottleneck](https://www.npmjs.com/package/bottleneck) to limit the requests to the Airtable API. Airtable's rate limit is five requests per second per base. Anything more than that and the API will lock down for thirty seconds. By implementing caching and rate limiting, we can control the number of requests sent to Airtable and prevent the db lockdown.

## About the project

For more details on the Twin Cities Mutual Aid Project and getting involved, view [the website README](https://github.com/Twin-Cities-Mutual-Aid/twin-cities-aid-distribution-locations#about-the-project).

## Feature requests & feedback

We're using [Github Issues](https://github.com/Twin-Cities-Mutual-Aid/twin-cities-aid-distribution-locations/issues) to manage tasks, and have a [kanban board](https://github.com/orgs/Twin-Cities-Mutual-Aid/projects/1) set up. If you'd like access to the kanban board reach out in the [OTC slack channel](https://otc-slackin.herokuapp.com/).

If you've got a feature request or feedback to share on the website or backend, feel free to [submit an issue](https://github.com/Twin-Cities-Mutual-Aid/twin-cities-aid-distribution-locations/issues/new) on GH issues, or bring it up in slack.

## How TCMAP API works

Four files make up the api:

### server.js

This is the entrypoint of the app which has the api endpoints defined.

* /v1/mutual_aid_sites
* /health

### siteService.js

This is the service layer which calls either the cacheService or the airtableClient to get the mutual aid site data. This service also handles business logic, data validation, and data mapping.

### cacheService.js

Manages reading and writing json files from local storage to ease load on Airtable rate limit

* `readCache(path)` – returns cached json data if not too stale. Change `cacheInterval` to adjust.
* `writeCache(path, object)` – writes a JavaScript object to JSON at the specified path, creating intermediate directories as needed.

### airtableClient.js

Client which uses the [airtable.js library](https://github.com/airtable/airtable.js/) to connect to TCMAP base and returns the results as a JSON response.

[Bottleneck](https://www.npmjs.com/package/bottleneck) handles rate limiting. The Airtable database interactions are handled using Bottleneck's wrap function.

Base ID and Airtable API key are in 🗝.env.

For more on accessing Airtable via the API, see the [interactive Airtable documentation](https://airtable.com/api).

## Run locally

1. Create `.env` file with required values (see `Environment Variable` section below)
2. Run `npm install`
3. Run this command from the project directory: `node server.js`
4. Open browser and go to url: `http://localhost:3000/v1/mutual_aid_sites`. You should see json of mutual aid site data in browser window.

## Run tests

Run `npm test`

## Contributions

If you're ready to start contributing:

1. Reach out to **#tc-aid-dev** channel in the Open Twin Cities Slack or **#dragon-riders** channel in Twin Cities Mutual Aid Project Slack and ask to be added to the **Developers** team for the Twin-Cities-Mutual-Aid Github organization. This will give you access to create branches and push to a clone of the tcmap-api repo and will give you read access to the [secrets](https://github.com/Twin-Cities-Mutual-Aid/secrets) repo for local environment variables.
2. Clone down the repo - be sure to clone and not fork. Our current CI/CD solution (TravisCI) cannot inject environment variables to forks so any PRs submitted from a fork will have failing tests.
3. Take a look at the Kanban board, assign yourself to an issue, and pull it into **In Progress**. Issues on the Kanban board tagged with **Ready To Go** or **Good First Issue** are good ones to start with.
4. Create a branch following the format `issue-<issue#>/<github-username>/<short-description-of-work>`.
5. Code to your heart's content!
6. Reach out to either slack channel listed above for any questions.
7. When you are ready for review, submit a pull request and tag anyone from the **Approvers** team to review.
8. When your code has been approved, squash & merge the code.

## Tech Stack

* Node
* Express
* Airtable
* Bottleneck
* Heroku - Deployment pipeline
* Jest testing
* TravisCI
* [Testing framework to come]

## Environment Variables

The application uses [environmental variables](https://en.wikipedia.org/wiki/Environment_variable) to inject secrets into app and manage configuration between environments. These values are set in a `.env` file in the project root directory.

To set up a `.env`, copy the `.env.example` file, which lists needed configuration values. For example, in the Mac OS terminal:

```bash
cp .env.example .env
```

A set variable in the `.env` file will look like this:

```env
AIRTABLE_API_KEY=1234
```

If you're a member of the Twin Cities Mutual Aid organization you can find the default values for the local development `env` file here:

https://github.com/Twin-Cities-Mutual-Aid/secrets/blob/master/.env

If not, you can ask for the most recent values of the configuration values from the Open Twin Cities slack `#tc-aid-dev` channel.

If you need to introduce a new environmental variable, please coordinate with developers in the `#tc-aid-dev` channel, add it to the `.env.example` file, and note it in your pull request.

## Code of Conduct

Contributors to the project are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
