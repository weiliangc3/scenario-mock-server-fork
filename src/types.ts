export type Result = {
	status: number;
	headers?: Record<string, string>;
	data?: unknown;
};

export type Scenario =
	| {
			name?: string;
			description?: string;
			context?: Context;
			mocks: Mock[];
			extend?: string;
	  }
	| Mock[];

export type ApiScenario = {
	id: string;
	name: string;
	description: null | string;
	selected: boolean;
};

export type InternalScenario = {
	id: string;
	name: string;
	description?: string;
	context?: Context;
	mocks: Mock[];
	extend?: string;
};

export type SetScenarioId = (scenarioId: string) => void;
export type SetContext = (context: Context) => void;

export type ScenarioMap = Record<string, Scenario>;

export type InternalScenarioMap = Record<string, InternalScenario>;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ResponseFunction<TInput, TResponse> = (
	input: TInput & {
		updateContext: UpdateContext;
		context: Context;
	},
) => TResponse | Promise<TResponse>;

export type MockResponse<TInput, TResponse> =
	| TResponse
	| ResponseFunction<TInput, TResponse>;

type HttpResponse = Record<string, unknown> | string | null;

export type ResponseProps<TInput, TResponse> = {
	response?: MockResponse<
		TInput,
		{
			data?: TResponse;
			status?: number;
			headers?: Record<string, string>;
			delay?: number;
		}
	>;
};

export type HttpMock = {
	path: string | RegExp;
	method: HttpMethod;
} & ResponseProps<
	{
		query: Record<string, string | Array<string>>;
		body: Record<string, unknown>;
		params: Record<string, string>;
		headers: Record<string, string>;
	},
	HttpResponse
>;

type GraphQlResponse = {
	data?: null | Record<string, unknown>;
	errors?: Array<unknown>;
};

export type Operation = {
	type: 'query' | 'mutation';
	name: string;
} & ResponseProps<
	{
		variables: Record<string, unknown>;
		headers: Record<string, string>;
	},
	GraphQlResponse
>;

export type GraphQlMock = {
	path: string;
	method: 'GRAPHQL';
	operations: Array<Operation>;
};

export type Mock = HttpMock | GraphQlMock;

export type Options = {
	port?: number;
	uiPath?: string;
	selectScenarioPath?: string;
	scenariosPath?: string;
	cookieMode?: boolean;
	parallelContextSize?: number;
};

export type Context = Record<string, unknown>;
export type PartialContext = Context | ((context: Context) => Context);

export type UpdateContext = (partialContext: PartialContext) => Context;

export type GetContext = () => Context;

export type CookieValue = {
	scenarioId: string;
	context: Context;
};

export type InternalRequest = {
	method: string;
	headers: Record<string, string>;
	query: Record<string, string | string[]>;
	path: string;
	body: string | Record<string, unknown>;
};

export type GetCookie = (cookieName: string) => string | undefined;
export type SetCookie = (cookieName: string, cookieValue: string) => void;
