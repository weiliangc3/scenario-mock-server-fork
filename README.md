# Scenario Mock Server

Mock server powered by scenarios.

## Table of contents

- [Scenario Mock Server](#scenario-mock-server)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
  - [Example usage](#example-usage)
  - [Cookie mode](#cookie-mode)
  - [Allowing for multiple responses](#allowing-for-multiple-responses)
  - [Running tests in parallel](#running-tests-in-parallel)
    - [sms-scenario-id header](#sms-scenario-id-header)
    - [sms-context-id header](#sms-context-id-header)
	- [Reloading scenarios](#reloading-scenarios)
		- [path](#path)
		- [fn](#fn)
  - [Additional API paths](#additional-api-paths)
    - [/scenarios](#scenarios)
    - [/select-scenario](#select-scenario)
    - [/groups](#groups)
  - [API](#api)
    - [createExpressApp](#createexpressapp)
    - [run](#run)
      - [scenarios](#scenarios-1)
      - [groups](#groups-1)
      - [options](#options)
  - [Types](#types)
    - [Mock](#mock)
    - [HttpMock](#httpmock)
    - [Response](#response)
    - [HttpResponseFunction](#httpresponsefunction)
    - [GraphQlMock](#graphqlmock)
      - [Operation](#operation)
    - [GraphQlResponse](#graphqlresponse)
    - [GraphQlResponseFunction](#graphqlresponsefunction)

## Installation

```
npm install scenario-mock-server
```

## Example usage

```javascript
const { run } = require('scenario-mock-server');

run({
	scenarios: {
		item: [
			{
				path: '/api/test-me',
				method: 'GET',
				response: { data: { blue: 'yoyo' } },
			},
		],
		cheese: [
			{
				path: '/api/test-me',
				method: 'GET',
				response: { data: { blue: 'cheese' } },
			},
		],
	},
});
```

Calls to `http://localhost:3000/api/test-me` will start by returning `{ blue: 'yoyo' }`.

Visiting `http://localhost:3000` will allow you to select a scenario. The first declared scenario will be initially selected. In this case, enabling `cheese` will modify `/api/test-me` so that it returns `{ blue: 'cheese' }`.

## Cookie mode

By default Scenario Mock Server runs in server mode storing the current selected scenario and context in server memory. Alternatively you can set `cookieMode` to true in the options, which stores the current scenario and context in a cookie instead. This is useful when you want to run a central mock server, but allow each user to select and store their own scenarios and associated contexts without it affecting other users.

## Allowing for multiple responses

Sometimes you may want an endpoint to respond with different status codes depending on what is sent. It is the recommendation of this package that this can be achieved by using scenarios. However, given `response` can be a function, it is possible to respond with a different value for the `status`, `headers`, `data` and `delay` properties:

```javascript
const mock = {
	path: '/some-path',
	method: 'GET',
	response: ({ body }) => {
		if (body.name === 'error1') {
			return {
				status: 400,
				data: { message: 'something went wrong' },
				delay: 1000,
			};
		}

		if (body.name === 'error2') {
			return {
				status: 500,
				data: { message: 'something else went wrong' },
				delay: 2000,
			};
		}

		if (body.name === 'notFound') {
			return {
				status: 404,
				data: { message: 'no data here' },
			};
		}

		// Default status is 200
		return { data: { message: 'success' } };
	},
};
```

## Running tests in parallel

Scenario Mock Server aims for mock data to be readily available while you're devloping locally, but also when you're running your tests.

The default behaviour of Scenario Mock Server is to run with one scenario active at a time. However, this falls down if you want to use multiple scenarios at the same time when running your tests in parallel. This is where 2 custom headers will become useful: `sms-scenario-id` and `sms-context-id`.

**Note:** These headers are not currently supported in `cookieMode`.

### sms-scenario-id header

When this header is set to the scenario id of choice, regardless of what the current scenario is set to in the server, all responses will behave as if this was the currently set scenario instead.

### sms-context-id header

This header must also be set when context is being used, otherwise context will reset on each call to the server when using the `sms-scenario-id` header.

## Reloading scenarios

To help active development while the mock server is running, the mock server can be loaded with a new set of scenarios, allowing you to make changes to your mock files and re-load them into the scenario mock server without needing a full restart of the mock server. This works by calling the `refresh.fn` when the `refresh.path` is POSTed to, expecting the `refresh.fn` to return a scenario map to be loaded into the scenario mock server. To configure this behaviour, during initialisation of the scenario-mock-server a refresh object can be passed into the options that takes 2 properties:

### `path`

You can optionally provide a `refresh.path` as a string that determines what path you can POST to to trigger a refresh. This defaults to `/refresh`.

### `fn`

Passing a function to `refresh.fn` will cause it to be called when the refresh path is POSTed to. The return value of the function will then be used as the new scenario map. For example:

```javascript
const getNewScenarios = () => {
	return newScenarioMap;
};

run({
	scenarios,
	options: {
		refresh: {
			path: '/refresh',
			fn: getNewScenarios,
		},
	},
});
```

## Additional API paths

In addition to responding to API requests as set up by the currently active scenario a few additional endpoints exist that return json:

- `/scenarios`
- `/select-scenario`
- `/groups`

These paths can be modified by using `options` (in case they clash with paths from scenarios).

### /scenarios

Returns an array of scenarios available. Use `GET`.

```ts
type ApiScenario = {
	id: string;
	name: string;
	description: null | string;
	selected: boolean;
	group: null | string;
};
```

### /select-scenario

Allows you to select which scenario is active. Use `PUT` and the following body:

```json
{
	"scenarioId": "{SCENARIO_YOU_WANT_TO_SELECT}"
}
```

### /groups

Returns an array of groups. Use `GET`.

```ts
type ApiGroup = {
	id: string;
	name: string;
};
```

## API

### createExpressApp

Returns the internal express instance.

> `function({ scenarios, options })`

### run

Returns an http server, with an additional kill method.

> `function({ scenarios, options })`

#### scenarios

> `{ [scenarioId]: Array<Mock> | { name, description, context, mocks, extend, group } }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property    | Type          | Default         | Description                                                       |
| ----------- | ------------- | --------------- | ----------------------------------------------------------------- |
| scenarioId  | `string`      | _required_      | Scenario id. Used in calls to /select-scenario.                   |
| Mock        | `Mock`        | _required_      | See [Mock](#mock) for more details.                               |
| name        | `string`      | `${scenarioId}` | Scenario name. Used in the UI and available in /scenarios.        |
| description | `string`      | `undefined`     | Scenario description. Used in the UI and available in /scenarios. |
| context     | `object`      | `undefined`     | Used to set up data across API calls.                             |
| mocks       | `Array<Mock>` | _required_      | See [Mock](#mock) for more details.                               |
| extend      | `string`      | `undefined`     | Use for extending other scenarios. Requires a scenario id.        |
| group       | `string`      | `undefined`     | Used for grouping scenarios in the UI.                            |

#### groups

> `{ [groupId]: groupName }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property  | Type     | Default    | Description                                           |
| --------- | -------- | ---------- | ----------------------------------------------------- |
| groupId   | `string` | _required_ | Group id. Matches with `group` assigned to scenarios. |
| groupName | `string` | _required_ | Used for heading in UI when groups exist.             |

#### options

> `{ port, uiPath, selectScenarioPath, scenariosPath, groupsPath, cookieMode, parallelContextSize, refresh }` | defaults to `{}`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property            | Type      | Default             | Description                                                                                                                    |
| ------------------- | --------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| port                | `number`  | `3000`              | Port that the http server runs on.                                                                                             |
| uiPath              | `string`  | `/`                 | Path that the UI will load on. `http://localhost:{port}{uiPath}`                                                               |
| selectScenarioPath  | `string`  | `/select-scenario`  | API path for selecting a scenario. `http://localhost:{port}{selectScenarioPath}`                                               |
| scenariosPath       | `string`  | `/scenarios`        | API path for getting scenarios. `http://localhost:{port}{scenariosPath}`                                                       |
| groupsPath          | `string`  | `/groups`           | API path for getting groups. `http://localhost:{port}{groupsPath}`                                                             |
| cookieMode          | `boolean` | `false`             | Whether or not to store scenario selections in a cookie rather than directly in the server                                     |
| parallelContextSize | `number`  | `10`                | How large to make the number of contexts that can run in parallel. See [Running tests in parallel](#running-tests-in-parallel) |
| refresh.path        | `string`  | `/refresh`          | API path for re-loading scenarios. See [Reloading scenarios](#reloading-scenarios)              															 |
| refresh.fn          | `number`  | `() => scenarioMap` | Function for to specify what scenarios to reload. See [Reloading scenarios](#reloading-scenarios) 														 |

## Types

### Mock

> `HttpMock | GraphQlMock`

See [HttpMock](#httpmock) and [GraphQlMock](#graphqlmock) for more details.

### HttpMock

> `{ path, method, response }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type                                                  | Default     | Description                                                           |
| -------- | ----------------------------------------------------- | ----------- | --------------------------------------------------------------------- |
| path     | `string` / `RegExp`                                   | _required_  | Path of endpoint. Must start with `/`.                                |
| method   | `'GET'` / `'POST'` / `'PUT'` / `'DELETE'` / `'PATCH'` | _required_  | HTTP method of endpoint.                                              |
| response | `undefined` / `Response` / `HttpResponseFunction`     | `undefined` | [Response](#response), [HttpResponseFunction](#httpresponsefunction). |

### Response

> `{ status, headers, data, delay }`

| Property | Type                         | Default         | Description                                                                                                                                                                                                        |
| -------- | ---------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| status   | `number`                     | `200`           | HTTP status code for response.                                                                                                                                                                                     |
| headers  | `object` / `undefined`       | See description | Key/value pairs of HTTP headers for response. Defaults to `undefined` when response is `undefined`, adds `'Content-Type': 'application/json'` when response is not `undefined` and `Content-Type` is not supplied. |
| data     | `null` / `string` / `object` | `undefined`     | Response data                                                                                                                                                                                                      |
| delay    | `number`                     | `0`             | Number of milliseconds before the response is returned.                                                                                                                                                            |

### HttpResponseFunction

> `function({ query, body, params, headers, context, updateContext }): response | Promise<response>`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property      | Type                     | Default                            | Description                                                                                                       |
| ------------- | ------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| query         | `object`                 | `{}`                               | query object as defined by `express`.                                                                             |
| body          | `object`                 | `{}`                               | body object as defined by `express`.                                                                              |
| params        | `object`                 | `{}`                               | params object as defined by `express`.                                                                            |
| `headers`     | `object`                 | `{}`                               | Request headers, lowercase keys, string values only.                                                              |
| context       | `object`                 | `{}`                               | Data stored across API calls.                                                                                     |
| updateContext | `Function`               | `partialContext => updatedContext` | Used to update context. `partialContext` can either be an `object` or a function (`context` => `partialContext`). |
| response      | `undefined` / `Response` | _required_                         | [Response](#response).                                                                                            |

### GraphQlMock

> `{ path, method, operations }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property   | Type               | Default    | Description                                                                            |
| ---------- | ------------------ | ---------- | -------------------------------------------------------------------------------------- |
| path       | `string`           | _required_ | Path of endpoint.                                                                      |
| method     | `'GRAPHQL'`        | _required_ | Indentifies this mock as a GraphQlMock.                                                |
| operations | `Array<Operation>` | _required_ | List of operations for GraphQL endpoint. See [Operation](#operation) for more details. |

#### Operation

> `{ type, name, response }`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property | Type                                                        | Default     | Description                                                                               |
| -------- | ----------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| type     | `'query'` / `'mutation'`                                    | _required_  | Type of operation.                                                                        |
| name     | `string`                                                    | _required_  | Name of operation.                                                                        |
| response | `undefined` / `GraphQlResponse` / `GraphQlResponseFunction` | `undefined` | [GraphQlResponse](#graphqlresponse), [GraphQlResponseFunction](#graphqlresponsefunction). |

### GraphQlResponse

> `{ status, headers, data, delay }`

| Property | Type                                       | Default         | Description                                                                                                                                                                                                        |
| -------- | ------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| status   | `number`                                   | `200`           | HTTP status code for response.                                                                                                                                                                                     |
| headers  | `object` / `undefined`                     | See description | Key/value pairs of HTTP headers for response. Defaults to `undefined` when response is `undefined`, adds `'Content-Type': 'application/json'` when response is not `undefined` and `Content-Type` is not supplied. |
| data     | `{ data?: null / object, errors?: array }` | `undefined`     | Response data                                                                                                                                                                                                      |
| delay    | `number`                                   | `0`             | Number of milliseconds before the response is returned.                                                                                                                                                            |

### GraphQlResponseFunction

> `function({ variables, headers, context, updateContext }): response | Promise<response>`

<!-- https://www.tablesgenerator.com/markdown_tables -->

| Property      | Type                            | Default                            | Description                                                                                                       |
| ------------- | ------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| variables     | `object`                        | `{}`                               | variables sent by client.                                                                                         |
| `headers`     | `object`                        | `{}`                               | Request headers, lowercase keys, string values only.                                                              |
| context       | `object`                        | `{}`                               | Data stored across API calls.                                                                                     |
| updateContext | `Function`                      | `partialContext => updatedContext` | Used to update context. `partialContext` can either be an `object` or a function (`context` => `partialContext`). |
| response      | `undefined` / `GraphQlResponse` | _required_                         | [GraphQlResponse](#graphqlresponse).                                                                              |
