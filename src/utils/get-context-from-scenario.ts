import { Context, InternalScenario, InternalScenarioMap } from '../types';
import { getScenarioIds } from './get-scenario-ids';

export { getContextFromScenario };

function getContextFromScenario(
	scenario: InternalScenario,
	scenarioMap: InternalScenarioMap,
) {
	const scenarioIds = getScenarioIds([], scenario, scenarioMap);

	let context: Context = {};
	for (const scenarioId of scenarioIds) {
		const scenario = scenarioMap[scenarioId];

		if (scenario.context) {
			context = { ...context, ...scenario.context };
		}
	}

	return context;
}
