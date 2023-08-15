import {
	getScenarioIdFromCookie,
	setScenarioMockServerCookie,
} from './cookies';
import {
	ApiScenario,
	Context,
	GetCookie,
	InternalScenario,
	InternalScenarioMap,
	Result,
	SetContext,
	SetCookie,
	SetScenarioId,
} from './types';
import { getContextFromScenario } from './utils/get-context-from-scenario';

export { selectScenario, getScenarios };

function getScenarios({
	getCookie,
	setCookie,
	getServerScenarioId,
	cookieMode,
	initialScenarioId,
	initialContext,
	scenarios,
}: {
	getCookie: GetCookie;
	setCookie: SetCookie;
	getServerScenarioId: () => string;
	cookieMode: boolean;
	initialScenarioId: string;
	initialContext: Context;
	scenarios: InternalScenario[];
}) {
	const scenarioId = getScenarioId({
		getCookie,
		setCookie,
		getServerScenarioId,
		cookieMode,
		initialScenarioId,
		initialContext,
	});

	const allScenarios: Array<ApiScenario> = scenarios.map(
		({ id, name, description, group }) => ({
			id,
			name,
			description: description === undefined ? null : description,
			selected: id === scenarioId,
			group: group === undefined ? null : group,
		}),
	);

	return {
		status: 200,
		headers: {
			'content-type': 'application/json',
		},
		data: allScenarios,
	};
}

function selectScenario({
	scenarioId,
	scenarioMap,
	cookieMode,
	setCookie,
	setServerContext,
	setServerScenarioId,
}: {
	scenarioId: string;
	scenarioMap: InternalScenarioMap;
	cookieMode: boolean;
	setCookie: SetCookie;
	setServerContext: SetContext;
	setServerScenarioId: SetScenarioId;
}): Result {
	const updatedScenario = scenarioMap[scenarioId];

	if (!updatedScenario) {
		return {
			status: 400,
			headers: {
				'content-type': 'application/json',
			},
			data: {
				message: `Scenario id "${scenarioId}" does not exist`,
			},
		};
	}

	updateScenarioAndContext({
		cookieMode,
		scenarioId,
		scenarioMap,
		setCookie,
		setServerContext,
		setServerScenarioId: setServerScenarioId,
	});

	return { status: 204 };
}

function updateScenarioAndContext({
	scenarioId,
	scenarioMap,
	cookieMode,
	setCookie,
	setServerContext,
	setServerScenarioId,
}: {
	scenarioId: string;
	scenarioMap: InternalScenarioMap;
	cookieMode: boolean;
	setCookie: SetCookie;
	setServerContext: (context: Context) => void;
	setServerScenarioId: (scenarioId: string) => void;
}) {
	const context = getContextFromScenario(scenarioMap[scenarioId], scenarioMap);

	if (cookieMode) {
		setScenarioMockServerCookie({
			setCookie,
			value: {
				scenarioId,
				context,
			},
		});

		return;
	}

	setServerContext(context);
	setServerScenarioId(scenarioId);
}

function getScenarioId({
	getCookie,
	setCookie,
	getServerScenarioId,
	cookieMode,
	initialScenarioId,
	initialContext,
}: {
	getCookie: GetCookie;
	setCookie: SetCookie;
	getServerScenarioId: () => string;
	cookieMode: boolean;
	initialScenarioId: string;
	initialContext: Context;
}) {
	if (cookieMode) {
		return getScenarioIdFromCookie({
			getCookie,
			setCookie,
			defaultValue: {
				scenarioId: initialScenarioId,
				context: initialContext,
			},
		});
	}

	return getServerScenarioId();
}
