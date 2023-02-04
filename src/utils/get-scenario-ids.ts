import { InternalScenario, InternalScenarioMap } from '../types';

export { getScenarioIds };

// Using an initial scenario get a list of all scenario ids ordered by how the initial scenario is extended
function getScenarioIds(
	scenarioIds: string[],
	scenario: InternalScenario,
	scenarioMap: InternalScenarioMap,
): string[] {
	const scenarioIdsResult = [scenario.id].concat(scenarioIds);

	if (scenario.extend) {
		const scenarioToExtend = scenarioMap[scenario.extend];

		if (scenarioToExtend) {
			return getScenarioIds(scenarioIdsResult, scenarioToExtend, scenarioMap);
		}
	}

	return scenarioIdsResult;
}
