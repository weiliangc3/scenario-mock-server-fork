import React from 'react';

import { ApiScenario } from './types';

function Html({
	updatedScenarioName,
	uiPath,
	scenarios,
	groups,
}: {
	uiPath: string;
	scenarios: Array<ApiScenario>;
	groups: Record<string, string>;
	updatedScenarioName?: string;
}) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<title>
					{`${updatedScenarioName ? 'Updated - ' : ''}Scenarios - Scenario Mock
					Server`}
				</title>
				<link
					rel="stylesheet"
					href={`${uiPath}${uiPath.slice(-1) === '/' ? '' : '/'}index.css`}
				/>
			</head>
			<body>
				<main>
					<ScenarioUpdateInfo updatedScenarioName={updatedScenarioName} />
					<form className="stack-1" method="POST" action={uiPath}>
						<p>
							<a href={uiPath}>Refresh page</a>
						</p>
						<CallToActionButton />
						<fieldset className="stack-3">
							<legend>
								<h1>Scenarios</h1>
							</legend>
							{scenarios.some(({ group }) => group !== null) ? (
								<GroupedScenarios groups={groups} scenarios={scenarios} />
							) : (
								<ScenarioList scenarios={scenarios} />
							)}
						</fieldset>
						<CallToActionButton />
					</form>
				</main>
			</body>
		</html>
	);
}

function ScenarioUpdateInfo({
	updatedScenarioName,
}: {
	updatedScenarioName?: string;
}) {
	if (!updatedScenarioName) {
		return null;
	}

	return <>Updated to the following scenario: {updatedScenarioName}</>;
}

function CallToActionButton() {
	return (
		<button type="submit" name="button" value="modify">
			Select scenario
		</button>
	);
}

const NULL_GROUP_ID = 'sms-other';

function GroupedScenarios({
	groups,
	scenarios,
}: {
	groups: Record<string, string>;
	scenarios: Array<ApiScenario>;
}) {
	const groupedScenarios: Record<string, Array<ApiScenario>> = {};

	scenarios.forEach((scenario) => {
		const group = scenario.group === null ? NULL_GROUP_ID : scenario.group;

		groupedScenarios[group] = groupedScenarios[group] || [];
		groupedScenarios[group].push(scenario);
	});

	const groupsWithLabelIds = Object.keys(groups);
	const groupsWithoutLabelIds = Object.keys(groupedScenarios).filter(
		(groupId) =>
			!groupsWithLabelIds.includes(groupId) && groupId !== NULL_GROUP_ID,
	);

	const groupEntries = Object.entries(groups)
		.concat(groupsWithoutLabelIds.map((groupId) => [groupId, groupId]))
		.concat([[NULL_GROUP_ID, 'Other']]);

	return (
		<>
			{groupEntries.map(([groupId, groupName]) => (
				<div key={groupId}>
					<h2>{groupName}</h2>
					<ScenarioList scenarios={groupedScenarios[groupId]} />
				</div>
			))}
		</>
	);
}

function ScenarioList({ scenarios }: { scenarios: Array<ApiScenario> }) {
	return (
		<div className="stack-3">
			{scenarios.map((scenario) => (
				<div key={scenario.id}>
					<input
						type="radio"
						id={scenario.id}
						name="scenarioId"
						value={scenario.id}
						defaultChecked={scenario.selected}
					/>
					<label htmlFor={scenario.id}>{scenario.name}</label>
					{scenario.description ? (
						<>
							<br />
							<details>
								<summary>Description</summary>
								<div className="description">{scenario.description}</div>
							</details>
						</>
					) : null}
				</div>
			))}
		</div>
	);
}

export { Html };
