import { DefinitionNode, Kind, OperationDefinitionNode } from 'graphql';
import gql from 'graphql-tag';
import z from 'zod';

import { createHandler } from './create-handler';
import {
	GraphQlMock,
	Mock,
	UpdateContext,
	GetContext,
	InternalRequest,
	Result,
	Operation,
} from './types';

export { getGraphQlMocks, getGraphQlMock, graphQlRequestHandler };

function isGraphQlMock(mock: Mock): mock is GraphQlMock {
	return mock.method === 'GRAPHQL';
}

function getGraphQlMocks(mocks: Mock[]): GraphQlMock[] {
	const graphQlMocksByPathAndOperations: Record<
		string,
		Record<string, Operation>
	> = {};

	mocks.filter(isGraphQlMock).forEach(({ path, operations }) => {
		const operationsByTypeAndName: Record<string, Operation> =
			graphQlMocksByPathAndOperations[path]
				? graphQlMocksByPathAndOperations[path]
				: {};

		operations.forEach((operation) => {
			// Always take the latest operation
			operationsByTypeAndName[`${operation.type}${operation.name}`] = operation;
		});

		graphQlMocksByPathAndOperations[path] = operationsByTypeAndName;
	});

	return Object.entries(graphQlMocksByPathAndOperations).map(
		([path, operationsByTypeAndName]) => ({
			method: 'GRAPHQL' as const,
			path,
			operations: Object.values(operationsByTypeAndName),
		}),
	);
}

const bodySchema = z
	.object({
		query: z.string().optional(),
		operationName: z.string().optional(),
		variables: z.object({}).passthrough().optional(),
	})
	.default({})
	.catch({});

function getGraphQlMock(path: string, graphqlMocks: GraphQlMock[]) {
	return graphqlMocks.find((graphQlMock) => graphQlMock.path === path) || null;
}

function isOperationDefinition(
	definition: DefinitionNode,
): definition is OperationDefinitionNode {
	return definition.kind === Kind.OPERATION_DEFINITION;
}

async function graphQlRequestHandler({
	req,
	graphQlMock,
	updateContext,
	getContext,
}: {
	req: InternalRequest;
	graphQlMock: GraphQlMock;
	updateContext: UpdateContext;
	getContext: GetContext;
}): Promise<Result> {
	if (!['GET', 'POST'].includes(req.method)) {
		return { status: 404 };
	}

	let query: string;
	const body = bodySchema.parse(req.body);

	if (req.headers['content-type'] === 'application/graphql') {
		query = typeof req.body === 'string' ? req.body : '';
	} else {
		query =
			body.query ||
			(Array.isArray(req.query.query) ? '' : req.query.query) ||
			'';
	}

	let graphqlAst;
	try {
		graphqlAst = gql(query);
	} catch (error) {
		return {
			status: 400,
			headers: {
				'Content-Type': 'application/json',
			},
			data: { message: `query "${query}" is not a valid GraphQL query` },
		};
	}

	const operationDefitions = graphqlAst.definitions.filter(
		isOperationDefinition,
	);

	if (
		operationDefitions.length > 1 &&
		!body.operationName &&
		!req.query.operationName
	) {
		return {
			status: 400,
			headers: {
				'Content-Type': 'application/json',
			},
			data: {
				message: `operationName required`,
			},
		};
	}

	const operationName =
		body.operationName ||
		req.query.operationName ||
		// Select the first operation
		operationDefitions[0].name?.value;

	if (typeof operationName !== 'string') {
		return {
			status: 400,
			headers: {
				'Content-Type': 'application/json',
			},
			data: {
				message: `Operation name required`,
			},
		};
	}

	const operationDefinition = operationDefitions.find(
		(definition) => definition.name?.value === operationName,
	);

	if (!operationDefinition) {
		return {
			status: 400,
			headers: {
				'Content-Type': 'application/json',
			},
			data: {
				message: `Operation "${operationName}" could not be found`,
			},
		};
	}

	const operationType = operationDefinition.operation;

	if (operationType === 'subscription') {
		return {
			status: 400,
			headers: {
				'Content-Type': 'application/json',
			},
			data: {
				message: `Subscriptions are not supported`,
			},
		};
	}

	if (operationType === 'mutation' && req.method === 'GET') {
		return {
			status: 400,
			headers: {
				'Content-Type': 'application/json',
			},
			data: {
				message: `Mutations cannot be resolved over GET`,
			},
		};
	}

	let variables: Record<string, unknown> | undefined = body.variables;
	if (
		variables === undefined &&
		req.query.variables &&
		!Array.isArray(req.query.variables)
	) {
		try {
			variables = JSON.parse(req.query.variables);
		} catch {
			// Do nothing
		}
	}
	variables = variables || {};

	const operation = graphQlMock.operations.find(
		({ type, name }) => operationType === type && name === operationName,
	);

	if (!operation) {
		return { status: 404 };
	}

	const handler = createHandler({
		getContext,
		updateContext,
		response: operation.response,
	});

	return handler({ variables, headers: req.headers });
}
