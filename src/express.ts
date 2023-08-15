import path from 'node:path';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import z from 'zod';

import type {
	Options,
	Context,
	InternalRequest,
	Result,
	InternalScenario,
	InternalScenarioMap,
	ScenarioMap,
	Groups,
	ScenarioWithOptionalProperties,
	Scenario,
} from './types';

import { getUi, updateUi } from './ui';
import { getContextFromScenario } from './utils/get-context-from-scenario';
import { handleRequest } from './handle-request';
import { getScenarios as apiGetScenarios, selectScenario } from './apis';
import { LruCache } from './utils/lru-cache';

export { createExpressApp };

function scenarioHasGroup(scenario: Scenario): scenario is Omit<
	ScenarioWithOptionalProperties,
	'group'
> & {
	group: string;
} {
	return !Array.isArray(scenario) && scenario.group != null;
}

function validateAllGroupsHaveNames({
	scenarios,
	groups,
}: {
	scenarios: ScenarioMap;
	groups: Groups;
}) {
	const uniqueGroups = Array.from(
		Object.values(scenarios)
			.filter(scenarioHasGroup)
			.reduce((set, { group }) => {
				set.add(group);

				return set;
			}, new Set<string>())
			.values(),
	);

	const groupsWithoutNames = uniqueGroups.filter((group) => !groups[group]);

	if (groupsWithoutNames.length > 0) {
		console.warn(
			`The following groups do not have a name: ${groupsWithoutNames.join(
				', ',
			)}`,
		);
	}
}

function createExpressApp({
	scenarios: externalScenarioMap,
	options = {},
	groups = {},
}: {
	scenarios: ScenarioMap;
	options?: Omit<Options, 'port'>;
	groups?: Groups;
}): ReturnType<typeof express> {
	const {
		uiPath = '/',
		selectScenarioPath = '/select-scenario',
		scenariosPath = '/scenarios',
		groupsPath = '/groups',
		cookieMode = false,
		parallelContextSize = 10,
	} = options;

	validateAllGroupsHaveNames({ scenarios: externalScenarioMap, groups });

	const { scenarios, scenarioMap } = generateScenarios(externalScenarioMap);
	const { initialScenarioId, initialContext } = generatInitialValues(
		scenarios,
		scenarioMap,
	);

	let serverScenarioId = initialScenarioId;
	let serverContext = initialContext;
	const contextCache = new LruCache(parallelContextSize);

	const app = express();
	app.use(cors({ credentials: true }));
	app.use(cookieParser());
	app.use(uiPath, express.static(path.join(__dirname, 'assets')));
	app.use(express.urlencoded({ extended: false }));
	app.use(express.json());
	app.use(express.text({ type: 'application/graphql' }));

	app.get(uiPath, (req, res) => {
		const html = getUi({
			uiPath,
			cookieMode,
			initialScenarioId,
			initialContext,
			getCookie: expressGetCookie(req),
			setCookie: expressSetCookie(res),
			getServerScenarioId,
			scenarios,
			groups,
		});

		res.send(html);
	});

	app.post(uiPath, ({ body }, res) => {
		const scenarioId = z.string().parse(body.scenarioId);

		const html = updateUi({
			uiPath,
			initialScenarioId,
			scenarioId,
			scenarioMap,
			scenarios,
			cookieMode,
			setCookie: expressSetCookie(res),
			setServerContext,
			setServerScenarioId,
			groups,
		});

		res.send(html);
	});

	app.put(selectScenarioPath, ({ body }: Request, res: Response) => {
		const scenarioId = z.string().parse(body.scenarioId);

		const result = selectScenario({
			scenarioId,
			cookieMode,
			scenarioMap,
			setCookie: expressSetCookie(res),
			setServerContext,
			setServerScenarioId,
		});

		expressResponse(res, result);
	});

	app.get(scenariosPath, (req: Request, res: Response) => {
		const result = apiGetScenarios({
			getCookie: expressGetCookie(req),
			setCookie: expressSetCookie(res),
			getServerScenarioId,
			cookieMode,
			initialScenarioId,
			initialContext,
			scenarios,
		});

		expressResponse(res, result);
	});

	app.get(groupsPath, (_: Request, res: Response) => {
		expressResponse(res, {
			status: 200,
			headers: {
				'content-type': 'application/json',
			},
			data: Object.entries(groups).map(([id, name]) => ({ id, name })),
		});
	});

	app.use(async (req, res) => {
		const internalRequest: InternalRequest = {
			body: req.body,
			headers: expressCleanHeaders(req.headers || {}),
			method: req.method,
			path: req.path,
			query: req.query as Record<string, string | string[]>,
		};

		try {
			const result = await handleRequest({
				req: internalRequest,
				getServerScenarioId: getServerScenarioId,
				initialScenarioId,
				initialContext,
				scenarioMap,
				getServerContext,
				setServerContext,
				cookieMode,
				getCookie: expressGetCookie(req),
				setCookie: expressSetCookie(res),
				contextCache,
			});

			expressResponse(res, result);
		} catch (error) {
			if (error instanceof Error) {
				expressResponse(res, {
					status: 500,
					data: { message: error.message },
				});

				return;
			}

			console.error(error);

			expressResponse(res, {
				status: 500,
				data: { message: 'Unknown error - check logs' },
			});
		}
	});

	return app;

	function getServerScenarioId() {
		return serverScenarioId;
	}

	function getServerContext() {
		return serverContext;
	}

	function setServerContext(context: Context) {
		serverContext = context;
	}

	function setServerScenarioId(scenarioId: string) {
		serverScenarioId = scenarioId;
	}
}

function generateScenarios(externalScenarioMap: ScenarioMap) {
	const scenarioMap: InternalScenarioMap = {};
	const scenarios: InternalScenario[] = [];
	for (const [id, scenario] of Object.entries(externalScenarioMap)) {
		let internalScenario: InternalScenario = { id, name: id, mocks: [] };

		if (Array.isArray(scenario)) {
			internalScenario.mocks = scenario;
		} else {
			internalScenario = { ...internalScenario, ...scenario };
		}

		scenarioMap[id] = internalScenario;
		scenarios.push(internalScenario);
	}

	if (scenarios.length === 0) {
		throw new Error('No scenarios defined');
	}

	return { scenarios, scenarioMap };
}

function generatInitialValues(
	scenarios: InternalScenario[],
	scenarioMap: InternalScenarioMap,
) {
	const initialScenario = scenarios[0];
	const initialScenarioId = initialScenario.id;
	const initialContext = getContextFromScenario(initialScenario, scenarioMap);

	return { initialScenarioId, initialContext };
}

function expressSetCookie(res: Response) {
	return (cookieName: string, cookieValue: string) => {
		res.cookie(cookieName, cookieValue, { encode: String });
	};
}

function expressGetCookie(req: Request) {
	return (cookieName: string) => req.cookies[cookieName];
}

function expressCleanHeaders(
	headers: Request['headers'],
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(headers).filter(
			(keyValuePair): keyValuePair is [string, string] =>
				typeof keyValuePair[1] === 'string',
		),
	);
}

function expressResponse(res: Response, { status, headers, data }: Result) {
	res
		.set(headers)
		.status(status)
		.send(
			headers && headers['content-type'] === 'application/json'
				? JSON.stringify(data)
				: data,
		);
}
