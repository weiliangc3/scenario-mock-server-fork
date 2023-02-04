import { transform } from 'server-with-kill';

import { createExpressApp } from './express';
import { Options, ScenarioMap } from './types';

export { run };

function run({
	scenarios,
	options = {},
}: {
	scenarios: ScenarioMap;
	options?: Options;
}) {
	const { port = 3000, ...restOfOptions } = options;

	const app = createExpressApp({
		scenarios,
		options: restOfOptions,
	});

	return transform(
		app.listen(port, () => {
			console.log(`Server running on port ${port}`);
		}),
	);
}
