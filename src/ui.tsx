import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
	Context,
	GetCookie,
	SetCookie,
	InternalScenario,
	InternalScenarioMap,
	SetScenarioId,
	SetContext,
	Groups,
} from './types';
import { Html } from './Html';
import { getScenarios, selectScenario } from './apis';

export { getUi, updateUi };

function getUi({
	uiPath,
	cookieMode,
	scenarios,
	initialScenarioId,
	initialContext,
	getCookie,
	setCookie,
	getServerScenarioId,
	groups,
}: {
	uiPath: string;
	cookieMode: boolean;
	scenarios: InternalScenario[];
	initialScenarioId: string;
	initialContext: Context;
	getCookie: GetCookie;
	setCookie: SetCookie;
	getServerScenarioId: () => string;
	groups: Groups;
}) {
	const { data } = getScenarios({
		cookieMode,
		initialContext,
		initialScenarioId,
		scenarios,
		getCookie,
		getServerScenarioId,
		setCookie,
	});

	const html = renderToStaticMarkup(
		<Html uiPath={uiPath} scenarios={data} groups={groups} />,
	);

	return '<!DOCTYPE html>\n' + html;
}

function updateUi({
	scenarioId,
	uiPath,
	scenarioMap,
	scenarios,
	cookieMode,
	setCookie,
	setServerContext,
	setServerScenarioId,
	groups,
}: {
	scenarioId: string;
	uiPath: string;
	scenarioMap: InternalScenarioMap;
	scenarios: InternalScenario[];
	cookieMode: boolean;
	initialScenarioId: string;
	setCookie: SetCookie;
	setServerContext: SetContext;
	setServerScenarioId: SetScenarioId;
	groups: Groups;
}) {
	const updatedScenarioName = scenarioMap[scenarioId].name;

	selectScenario({
		cookieMode,
		scenarioId,
		scenarioMap,
		setCookie,
		setServerContext,
		setServerScenarioId,
	});

	const allScenarios = scenarios.map(({ id, name, description, group }) => ({
		id,
		name,
		description: description === undefined ? null : description,
		selected: id === scenarioId,
		group: group === undefined ? null : group,
	}));

	const html = renderToStaticMarkup(
		<Html
			uiPath={uiPath}
			scenarios={allScenarios}
			groups={groups}
			updatedScenarioName={updatedScenarioName}
		/>,
	);

	return '<!DOCTYPE html>\n' + html;
}
