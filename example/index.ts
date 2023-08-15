import { run } from '../src';

run({
	scenarios: {
		default: {
			description: 'Default set of mocks',
			context: {
				a: 1,
				b: 2,
				c: 3,
			},
			mocks: [
				{
					path: '/api/test-me',
					method: 'GET',
					response: { data: { blue: 'yoyo' } },
				},
				{
					path: '/api/return/:someId',
					method: 'GET',
					response: ({ query, params }) => {
						return {
							data: {
								query,
								params,
							},
						};
					},
				},
				{
					path: '/api/return/:someId',
					method: 'POST',
					response: async ({ body, params }) => {
						return {
							data: {
								body,
								params,
							},
						};
					},
				},
				{
					path: '/api/graphql',
					method: 'GRAPHQL',
					operations: [
						{
							type: 'query',
							name: 'Cheese',
							response: {
								data: {
									data: {
										name: 'Cheddar',
									},
								},
							},
						},
						{
							type: 'query',
							name: 'Bread',
							response: {
								data: {
									data: {
										name: 'Bread Roll',
									},
								},
							},
						},
					],
				},
				{
					path: '/api/graphql-function',
					method: 'GRAPHQL',
					operations: [
						{
							type: 'query',
							name: 'Function',
							response: async ({ variables }) => {
								return {
									data: {
										data: {
											variables,
										},
									},
								};
							},
						},
					],
				},
				{
					path: '/api/context',
					method: 'GET',
					response: ({ context }) => ({ data: context }),
				},
				{
					path: '/api/context',
					method: 'PUT',
					response: ({ body, updateContext }) => ({
						data: updateContext(body),
					}),
				},
			],
		},
		blueCheese: {
			name: 'Blue cheese',
			group: 'cheese',
			mocks: [
				{
					path: '/api/test-me',
					method: 'GET',
					response: { data: { blue: 'cheese' } },
				},
				{
					path: '/api/graphql',
					method: 'GRAPHQL',
					operations: [
						{
							type: 'query',
							name: 'Cheese',
							response: {
								data: {
									data: {
										name: 'Blue Cheese',
									},
								},
							},
						},
					],
				},
			],
		},
		redCheese: {
			name: 'Red cheese',
			group: 'cheese',
			mocks: [
				{
					path: '/api/test-me',
					method: 'GET',
					response: { data: { red: 'leicester' } },
				},
				{
					path: '/api/graphql',
					method: 'GRAPHQL',
					operations: [
						{
							type: 'query',
							name: 'Cheese',
							response: {
								data: {
									data: {
										name: 'Red Leicester',
									},
								},
							},
						},
					],
				},
			],
		},
		tigerBread: {
			name: 'Tiger bread',
			group: 'bread',
			extend: 'default',
			mocks: [],
		},
		baguette: {
			name: 'Baguette',
			group: 'bread',
			extend: 'default',
			mocks: [],
		},
		fish: {
			name: 'Fish',
			extend: 'default',
			mocks: [
				{
					path: '/api/test-me-2',
					method: 'GET',
					response: { data: { blue: 'tang' } },
				},
			],
		},
		water: {
			name: 'Water',
			extend: 'default',
			mocks: [],
		},
	},
	groups: {
		bread: 'Bread',
		cheese: 'Cheese',
	},
});
