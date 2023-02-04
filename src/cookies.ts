import z from 'zod';

import { CookieValue, GetCookie, SetCookie, Context } from './types';

export {
	getScenarioMockServerCookie,
	setScenarioMockServerCookie,
	getScenarioIdFromCookie,
};

const CONTEXT_AND_SCENARIO_COOKIE_NAME = 'scenario-mock-server';

function getScenarioIdFromCookie({
	getCookie,
	setCookie,
	defaultValue,
}: {
	getCookie: GetCookie;
	setCookie: SetCookie;
	defaultValue: CookieValue;
}) {
	let cookieValue = defaultValue;
	const cookie = getCookie(CONTEXT_AND_SCENARIO_COOKIE_NAME);
	if (cookie) {
		try {
			cookieValue = JSON.parse(cookie);
		} catch (error) {
			// Cookie value was malformed, so needs resetting
			setCookie(CONTEXT_AND_SCENARIO_COOKIE_NAME, JSON.stringify(cookieValue));
		}
	}

	return cookieValue.scenarioId;
}

const cookieValueSchema = z.object({
	context: z.object({}).passthrough(),
	scenarioId: z.string(),
});

function getScenarioMockServerCookie({
	getCookie,
	initialScenarioId,
	initialContext,
}: {
	getCookie: GetCookie;
	initialScenarioId: string;
	initialContext: Context;
}): CookieValue {
	const cookie = getCookie(CONTEXT_AND_SCENARIO_COOKIE_NAME);

	if (cookie) {
		try {
			const parsedCookie = JSON.parse(cookie);

			return cookieValueSchema.parse(parsedCookie);
		} catch (error) {
			console.error('Cookie value could not be parsed');
		}
	}

	return {
		scenarioId: initialScenarioId,
		context: initialContext,
	};
}

function setScenarioMockServerCookie({
	setCookie,
	value,
}: {
	setCookie: SetCookie;
	value: CookieValue;
}) {
	setCookie(CONTEXT_AND_SCENARIO_COOKIE_NAME, JSON.stringify(value));
}
