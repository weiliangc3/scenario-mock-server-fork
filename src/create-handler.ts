import {
	ResponseProps,
	MockResponse,
	UpdateContext,
	ResponseFunction,
	GetContext,
	Result,
} from './types';

export { createHandler };

const DEFAULT_STATUS = 200;
const DEFAULT_DELAY = 0;

function createHandler<TInput, TResponse>({
	response = {},
	updateContext,
	getContext,
}: ResponseProps<TInput, TResponse> & {
	updateContext: UpdateContext;
	getContext: GetContext;
}) {
	return async (req: TInput): Promise<Result> => {
		const result = isResponseFunction(response)
			? await response({
					...req,
					updateContext,
					context: getContext(),
			  })
			: response;

		const { status = DEFAULT_STATUS, data, delay = DEFAULT_DELAY } = result;
		const headers = lowerCaseKeys(result.headers || {});

		await wait(delay);

		// Default repsonses to JSON when there's no content-type header
		if (data !== undefined && !headers['content-type']) {
			headers['content-type'] = 'application/json';
		}

		return {
			status,
			data,
			headers,
		};
	};
}

function wait(responseDelay: number) {
	return new Promise((res) => setTimeout(res, responseDelay));
}

function isResponseFunction<TInput, TResponse>(
	response: MockResponse<TInput, TResponse>,
): response is ResponseFunction<TInput, TResponse> {
	return typeof response === 'function';
}

function lowerCaseKeys(obj: Record<string, string>) {
	return Object.fromEntries(
		Object.entries(obj).map(([key, value]) => [key.toLowerCase(), value]),
	);
}
