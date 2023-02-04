import { randomUUID } from 'crypto';

import {
	getGraphQlMocks,
	getGraphQlMock,
	graphQlRequestHandler,
} from './graph-ql';
import { getHttpMocks, getHttpMockAndParams, httpRequestHandler } from './http';
import {
	Context,
	PartialContext,
	InternalRequest,
	Result,
	GetCookie,
	SetCookie,
	InternalScenario,
	InternalScenarioMap,
} from './types';
import {
	getScenarioMockServerCookie,
	setScenarioMockServerCookie,
} from './cookies';
import { getScenarioIds } from './utils/get-scenario-ids';
import { getContextFromScenario } from './utils/get-context-from-scenario';
import { LruCache } from './utils/lru-cache';

const HEADER_SCENARIO_ID = 'sms-scenario-id';
const HEADER_CONTEXT_ID = 'sms-context-id';

function updateContext(context: Context, partialContext: PartialContext) {
	const newContext: Context = {
		...context,
		...(typeof partialContext === 'function'
			? partialContext(context)
			: partialContext),
	};

	return newContext;
}

function getMocksFromScenario(
	scenario: InternalScenario,
	scenarioMap: InternalScenarioMap,
) {
	const scenarioIds = getScenarioIds([], scenario, scenarioMap);
	const mocks = scenarioIds
		.map((scenarioId) => scenarioMap[scenarioId].mocks)
		.reduce((result, mocks) => result.concat(mocks), []);

	const httpMocks = getHttpMocks(mocks);
	const graphQlMocks = getGraphQlMocks(mocks);

	return { httpMocks, graphQlMocks };
}

async function handleRequest({
	req,
	getServerScenarioId,
	initialScenarioId,
	initialContext,
	scenarioMap,
	getServerContext,
	setServerContext,
	getCookie,
	cookieMode,
	setCookie,
	contextCache,
}: {
	req: InternalRequest;
	getServerScenarioId: () => string;
	initialScenarioId: string;
	initialContext: Context;
	scenarioMap: InternalScenarioMap;
	getServerContext: () => Context;
	setServerContext: (context: Context) => void;
	getCookie: GetCookie;
	setCookie: SetCookie;
	cookieMode: boolean;
	contextCache: LruCache;
}): Promise<Result> {
	const headerScenarioId = req.headers[HEADER_SCENARIO_ID];

	// randomUUID will effectively reset context for each call to the server when the above header is being set
	// and this header is not.
	const headerContextId = req.headers[HEADER_CONTEXT_ID] || randomUUID();

	if (headerScenarioId && cookieMode) {
		return {
			status: 400,
			data: {
				message: `Cannot use "${HEADER_SCENARIO_ID}" header when cookie mode is enabled`,
			},
		};
	}

	const scenarioMockServerCookie = getScenarioMockServerCookie({
		initialContext,
		initialScenarioId,
		getCookie,
	});

	const getScenarioId = headerScenarioId
		? () => headerScenarioId
		: cookieMode
		? () => scenarioMockServerCookie.scenarioId
		: getServerScenarioId;

	const getContext = headerScenarioId
		? () => {
				const context = contextCache.get(headerContextId);

				if (!context) {
					return getContextFromScenario(
						scenarioMap[headerScenarioId],
						scenarioMap,
					);
				}

				return context;
		  }
		: cookieMode
		? () => scenarioMockServerCookie.context
		: getServerContext;

	const setContext = req.headers[HEADER_SCENARIO_ID]
		? (context: Context) => {
				contextCache.set(headerContextId, context);
		  }
		: cookieMode
		? (context: Context) => {
				scenarioMockServerCookie.context = context;
		  }
		: setServerContext;

	const scenarioId = getScenarioId();

	const scenario = scenarioMap[scenarioId];

	const { httpMocks, graphQlMocks } = getMocksFromScenario(
		scenario,
		scenarioMap,
	);

	const graphQlMock = getGraphQlMock(req.path, graphQlMocks);

	// Default when nothing matches
	let result: Result = { status: 404 };

	if (graphQlMock) {
		result = await graphQlRequestHandler({
			req,
			graphQlMock,
			updateContext: localUpdateContext,
			getContext,
		});
	} else {
		const { httpMock, params } = getHttpMockAndParams(req, httpMocks);
		if (httpMock) {
			result = await httpRequestHandler({
				req,
				httpMock,
				params,
				getContext,
				updateContext: localUpdateContext,
			});
		}
	}

	if (cookieMode) {
		setScenarioMockServerCookie({ setCookie, value: scenarioMockServerCookie });
	}

	return result;

	function localUpdateContext(partialContext: PartialContext) {
		const newContext = updateContext(getContext(), partialContext);

		setContext(newContext);

		return newContext;
	}
}

export { handleRequest };
