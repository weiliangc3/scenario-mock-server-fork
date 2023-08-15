import { transform } from 'server-with-kill';

import { createExpressApp } from './express';
import { Options, ScenarioMap, Groups } from './types';

export { run };

function run({
	scenarios,
	options = {},
	groups = {},
}: {
	scenarios: ScenarioMap;
	options?: Options;
	groups?: Groups;
}) {
	const { port = 3000, ...restOfOptions } = options;

	const app = createExpressApp({
		scenarios,
		options: restOfOptions,
		groups,
	});

	return transform(
		app.listen(port, () => {
			console.log(`Server running on port ${port}`);
		}),
	);
}
