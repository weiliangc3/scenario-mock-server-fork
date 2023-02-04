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
}: {
	uiPath: string;
	cookieMode: boolean;
	scenarios: InternalScenario[];
	initialScenarioId: string;
	initialContext: Context;
	getCookie: GetCookie;
	setCookie: SetCookie;
	getServerScenarioId: () => string;
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

	const html = renderToStaticMarkup(<Html uiPath={uiPath} scenarios={data} />);

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

	const allScenarios = scenarios.map(({ id, name, description }) => ({
		id,
		name,
		description: description === undefined ? null : description,
		selected: id === scenarioId,
	}));

	const html = renderToStaticMarkup(
		<Html
			uiPath={uiPath}
			scenarios={allScenarios}
			updatedScenarioName={updatedScenarioName}
		/>,
	);

	return '<!DOCTYPE html>\n' + html;
}
