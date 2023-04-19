/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServerWithKill } from 'server-with-kill';
import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

import { run } from './index';
import { ApiScenario } from './types';

describe('run', () => {
	describe('port', () => {
		it('defaults to 3000', async () => {
			const server = run({
				scenarios: { test: [] },
			});

			await serverTest(server, () => {
				const address = server.address();
				const port =
					!!address && typeof address !== 'string' ? address.port : 0;

				expect(port).toEqual(3000);
			});
		});

		it('can be set using options', async () => {
			const expectedPort = 5000;
			const server = run({
				scenarios: { test: [] },
				options: { port: expectedPort },
			});

			await serverTest(server, () => {
				const address = server.address();
				const port =
					!!address && typeof address !== 'string' ? address.port : 0;

				expect(port).toEqual(expectedPort);
			});
		});
	});

	describe('headers', () => {
		it('Access-Control-Allow-Credentials set to true', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							path: '/test-me',
							method: 'GET',
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch('http://localhost:3000/test-me');

				expect(
					response.headers.get('access-control-allow-credentials'),
				).toEqual('true');
			});
		});

		it('Access-Control-Allow-Origin set to *', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							path: '/test-me',
							method: 'GET',
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch('http://localhost:3000/test-me');

				expect(response.headers.get('access-control-allow-origin')).toEqual(
					'*',
				);
			});
		});
	});

	describe('mocks', () => {
		it('respond as expected', async () => {
			const expectedGetResponse = { get: 'food' };
			const expectedPostResponse = { post: 'mail' };
			const expectedPutResponse = { put: 'it down' };
			const expectedDeleteResponse = { delete: 'program' };
			const expectedPatchResponse = { patch: 'it' };

			const server = run({
				scenarios: {
					test: [
						{
							path: '/test-me',
							method: 'GET',
							response: { data: expectedGetResponse },
						},
						{
							path: '/test-me',
							method: 'POST',
							response: { data: expectedPostResponse },
						},
						{
							path: '/test-me',
							method: 'PUT',
							response: { data: expectedPutResponse },
						},
						{
							path: '/test-me',
							method: 'DELETE',
							response: { data: expectedDeleteResponse },
						},
						{
							path: '/test-me',
							method: 'PATCH',
							response: { data: expectedPatchResponse },
						},
					],
				},
			});

			await serverTest(server, async () => {
				const [
					getResponse,
					postResponse,
					putResponse,
					deleteResponse,
					patchResponse,
				] = await Promise.all([
					fetch('http://localhost:3000/test-me').then((res) => res.json()),
					fetch('http://localhost:3000/test-me', { method: 'POST' }).then(
						(res) => res.json(),
					),
					fetch('http://localhost:3000/test-me', { method: 'PUT' }).then(
						(res) => res.json(),
					),
					fetch('http://localhost:3000/test-me', { method: 'DELETE' }).then(
						(res) => res.json(),
					),
					fetch('http://localhost:3000/test-me', { method: 'PATCH' }).then(
						(res) => res.json(),
					),
				]);

				expect(getResponse).toEqual(expectedGetResponse);
				expect(postResponse).toEqual(expectedPostResponse);
				expect(putResponse).toEqual(expectedPutResponse);
				expect(deleteResponse).toEqual(expectedDeleteResponse);
				expect(patchResponse).toEqual(expectedPatchResponse);
			});
		});

		it('delayed responses work', async () => {
			const responseDelay = 500;
			const server = run({
				scenarios: {
					test: [
						{
							path: '/test-me',
							method: 'GET',
							response: {
								delay: responseDelay,
							},
						},
					],
				},
			});

			await serverTest(server, async () => {
				const startTime = getStartTime();

				await fetch('http://localhost:3000/test-me');

				const duration = getDuration(startTime);

				expect(duration).toBeGreaterThanOrEqual(responseDelay);
			});
		});

		it('GraphQL delayed responses work', async () => {
			const responseDelay = 500;
			const server = run({
				scenarios: {
					test: [
						{
							path: '/graphql',
							method: 'GRAPHQL',
							operations: [
								{
									name: 'Query',
									type: 'query',
									response: {
										delay: responseDelay,
									},
								},
							],
						},
					],
				},
			});

			await serverTest(server, async () => {
				const startTime = getStartTime();

				await fetch(
					'http://localhost:3000/graphql?query=query Query { version }&operationName=Query',
				);

				const duration = getDuration(startTime);

				expect(duration).toBeGreaterThanOrEqual(responseDelay);
			});
		});

		it('can use functions for responses', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							path: '/test-function/:id',
							method: 'POST',
							response: ({ body, query, params, headers }) => ({
								data: {
									body,
									query,
									params,
									headers,
								},
							}),
						},
					],
				},
			});

			await serverTest(server, async () => {
				const id = 'some-id';
				const testQuery = 'test-query';
				const body = { some: 'body' };
				const headers = {
					'content-type': 'application/json',
					'x-trace-token': '543406ca-1ad9-5dcf-9155-111faf80d9e5',
				};

				const response: any = await fetch(
					`http://localhost:3000/test-function/${id}?testQuery=${testQuery}`,
					{
						method: 'POST',
						headers,
						body: JSON.stringify(body),
					},
				).then((res) => res.json());

				expect(response).toEqual(
					expect.objectContaining({
						body,
						query: {
							testQuery,
						},
						params: { id },
					}),
				);

				expect(response.headers['x-trace-token']).toEqual(
					headers['x-trace-token'],
				);
			});
		});

		it('can use async functions for responses', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							path: '/test-function/:id',
							method: 'POST',
							response: async ({ body, query, params }) => ({
								data: {
									body,
									query,
									params,
								},
							}),
						},
					],
				},
			});

			await serverTest(server, async () => {
				const id = 'some-id';
				const testQuery = 'test-query';
				const body = { some: 'body' };
				const response = await fetch(
					`http://localhost:3000/test-function/${id}?testQuery=${testQuery}`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(body),
					},
				).then((res) => res.json());

				expect(response).toEqual({
					body,
					query: {
						testQuery,
					},
					params: { id },
				});
			});
		});

		it('supports GraphQL query over GET', async () => {
			const expectedResponse = {
				data: {
					firstName: 'Alan',
				},
			};
			const server = run({
				scenarios: {
					default: {
						mocks: [
							{
								path: '/api/graphql',
								method: 'GRAPHQL',
								operations: [
									{
										type: 'query',
										name: 'Person',
										response: { data: expectedResponse },
									},
								],
							},
						],
					},
				},
			});

			await serverTest(server, async () => {
				const query = `
		      query Person {
		        firstName
		      }
		    `;
				const response = await fetch(
					`http://localhost:3000/api/graphql?query=${query}`,
				).then((res) => res.json());

				expect(response).toEqual(expectedResponse);
			});
		});

		it('supports GraphQL variables over GET', async () => {
			const getVariables = { a: 1, b: 2 };
			const expectedResponse = {
				data: {
					variables: getVariables,
				},
			};
			const server = run({
				scenarios: {
					default: [
						{
							path: '/api/graphql',
							method: 'GRAPHQL',
							operations: [
								{
									type: 'query',
									name: 'Person',
									response: ({ variables }) => ({
										data: {
											data: {
												variables,
											},
										},
									}),
								},
							],
						},
					],
				},
			});

			await serverTest(server, async () => {
				const query = `
		      query Person {
		        firstName
		      }
		    `;
				const response = await fetch(
					`http://localhost:3000/api/graphql?query=${query}&variables=${JSON.stringify(
						getVariables,
					)}`,
				).then((res) => res.json());

				expect(response).toEqual(expectedResponse);
			});
		});

		it('supports GraphQL over GET when operationName is provided', async () => {
			const operationName = 'Person';
			const expectedResponse = {
				data: {
					firstName: 'Alan',
				},
			};
			const server = run({
				scenarios: {
					default: [
						{
							path: '/api/graphql',
							method: 'GRAPHQL',
							operations: [
								{
									type: 'query',
									name: operationName,
									response: { data: expectedResponse },
								},
							],
						},
					],
				},
			});

			await serverTest(server, async () => {
				const query = `
		      query ${operationName} {
		        firstName
		      }
		    `;
				const response = await fetch(
					`http://localhost:3000/api/graphql?query=${query}&operationName=${operationName}`,
				).then((res) => res.json());

				expect(response).toEqual(expectedResponse);
			});
		});

		it('supports GraphQL query over POST', async () => {
			const expectedResponse = {
				data: {
					firstName: 'Alan',
				},
			};
			const server = run({
				scenarios: {
					default: [
						{
							path: '/api/graphql',
							method: 'GRAPHQL',
							operations: [
								{
									type: 'query',
									name: 'Person',
									response: { data: expectedResponse },
								},
							],
						},
					],
				},
			});

			await serverTest(server, async () => {
				const query = `
		      query Person {
		        firstName
		      }
		    `;
				const response = await fetch('http://localhost:3000/api/graphql', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						query,
					}),
				}).then((res) => res.json());

				expect(response).toEqual(expectedResponse);
			});
		});

		it('supports GraphQL variables over POST', async () => {
			const postVariables = { a: 1, b: 2 };
			const expectedResponse = {
				data: {
					variables: postVariables,
				},
			};
			const server = run({
				scenarios: {
					default: [
						{
							path: '/api/graphql',
							method: 'GRAPHQL',
							operations: [
								{
									type: 'query',
									name: 'Person',
									response: ({ variables }) => ({
										data: {
											data: {
												variables,
											},
										},
									}),
								},
							],
						},
					],
				},
			});

			await serverTest(server, async () => {
				const query = `
		      query Person {
		        firstName
		      }
		    `;
				const response = await fetch('http://localhost:3000/api/graphql', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						query,
						variables: postVariables,
					}),
				}).then((res) => res.json());

				expect(response).toEqual(expectedResponse);
			});
		});

		it('supports GraphQL query over POST when operationName is provided', async () => {
			const operationName = 'Person';
			const expectedResponse = {
				data: {
					firstName: 'Alan',
				},
			};
			const server = run({
				scenarios: {
					default: [
						{
							path: '/api/graphql',
							method: 'GRAPHQL',
							operations: [
								{
									type: 'query',
									name: operationName,
									response: { data: expectedResponse },
								},
							],
						},
					],
				},
			});

			await serverTest(server, async () => {
				const query = `
		      query ${operationName} {
		        firstName
		      }
		    `;
				const response = await fetch('http://localhost:3000/api/graphql', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query,
						operationName,
					}),
				}).then((res) => res.json());

				expect(response).toEqual(expectedResponse);
			});
		});

		it('nothing is matched when GraphQL mutation is named like a query', async () => {
			const server = run({
				scenarios: {
					default: [
						{
							path: '/api/graphql',
							method: 'GRAPHQL',
							operations: [
								{
									type: 'query',
									name: 'Query',
								},
							],
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch('http://localhost:3000/api/graphql', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query: 'mutation Query { a }',
					}),
				});

				expect(response.status).toEqual(404);
			});
		});

		it('GraphQL operations with the same name and different types allowed', async () => {
			const expectedResponse1 = {
				data: {
					user: {
						name: 'Felicity',
					},
				},
			};
			const expectedResponse2 = {
				data: {
					updateUser: {
						name: 'Felicity Green',
					},
				},
			};

			const server = run({
				scenarios: {
					default: [
						{
							path: '/api/graphql',
							method: 'GRAPHQL',
							operations: [
								{
									type: 'query',
									name: 'User',
									response: { data: expectedResponse1 },
								},
								{
									type: 'mutation',
									name: 'User',
									response: { data: expectedResponse2 },
								},
							],
						},
					],
				},
			});

			await serverTest(server, async () => {
				const [response1, response2] = await Promise.all([
					fetch('http://localhost:3000/api/graphql', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							query: 'query User { user { name } }',
						}),
					}).then((res) => res.json()),
					fetch('http://localhost:3000/api/graphql', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							query: 'mutation User { updateUser { name } }',
						}),
					}).then((res) => res.json()),
				]);

				expect(response1).toEqual(expectedResponse1);
				expect(response2).toEqual(expectedResponse2);
			});
		});

		it('GraphQL operations work when multiple queries and fragments are defined', async () => {
			const expectedResponse = {
				data: {
					user: {
						name: 'Gary',
					},
				},
			};

			const server = run({
				scenarios: {
					default: [
						{
							path: '/api/graphql',
							method: 'GRAPHQL',
							operations: [
								{
									type: 'query',
									name: 'GetUser',
									response: { data: expectedResponse },
								},
							],
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch('http://localhost:3000/api/graphql', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query: `
		          fragment userDetails on User {
		            name
		          }

		          query GetAccount {
		            account {
		              id
		            }
		          }

		          query GetUser {
		            user {
		              ...userDetails
		            }
		          }
		        `,
						operationName: 'GetUser',
					}),
				}).then((res) => res.json());

				expect(response).toEqual(expectedResponse);
			});
		});

		it('GraphQL errors when multiple queries exist and no operationName is sent', async () => {
			const server = run({
				scenarios: {
					default: [
						{
							path: '/api/graphql',
							method: 'GRAPHQL',
							operations: [
								{
									type: 'query',
									name: 'GetAccount',
									response: {
										data: {
											data: {
												account: {
													id: '111222',
												},
											},
										},
									},
								},
							],
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch('http://localhost:3000/api/graphql', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query: `
		            query GetAccount {
		              account {
		                id
		              }
		            }

		            query GetUser {
		              user {
		                name
		              }
		            }
		          `,
					}),
				});

				expect(response.status).toEqual(400);
			});
		});

		it('GraphQL errors when query has no operationName', async () => {
			const server = run({
				scenarios: {
					default: [
						{
							method: 'GRAPHQL',
							operations: [],
							path: '/api/graphql',
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch('http://localhost:3000/api/graphql', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query: `
		            {
		              user {
		                name
		              }
		            }
		          `,
					}),
				});

				expect(response.status).toEqual(400);
			});
		});

		it('GraphQL errors when operation is a subscription', async () => {
			const server = run({
				scenarios: {
					default: [
						{
							method: 'GRAPHQL',
							operations: [],
							path: '/api/graphql',
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch('http://localhost:3000/api/graphql', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query: `
							subscription Subscription {
		              user {
		                name
		              }
		            }
		          `,
					}),
				});

				expect(response.status).toEqual(400);
			});
		});

		it('GraphQL errors when sending a mutation over GET', async () => {
			const server = run({
				scenarios: {
					default: [
						{
							method: 'GRAPHQL',
							operations: [],
							path: '/api/graphql',
						},
					],
				},
			});

			await serverTest(server, async () => {
				const query = `
		      mutation Mutation {
		        name
		      }
		    `;
				const response = await fetch(
					`http://localhost:3000/api/graphql?query=${query}`,
				);

				expect(response.status).toEqual(400);
			});
		});

		it('GraphQL errors when supplied operationName does not exist in query', async () => {
			const server = run({
				scenarios: {
					default: [
						{
							method: 'GRAPHQL',
							path: '/api/graphql',
							operations: [
								{
									type: 'query',
									name: 'GetAccount',
									response: { data: { data: { account: { id: '333444' } } } },
								},
								{
									type: 'query',
									name: 'GetUser',
									response: { data: { data: { user: { name: 'Holly' } } } },
								},
							],
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch('http://localhost:3000/api/graphql', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query: `
		            query GetUser {
		              user {
		                name
		              }
		            }
		          `,
						operationName: 'GetAccount',
					}),
				});

				expect(response.status).toEqual(400);
			});
		});

		it('allows empty responses', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							path: '/api/test',
							method: 'GET',
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch(`http://localhost:3000/api/test`);
				const body = await response.text();

				expect(response.headers.get('content-type')).toBeNull();
				expect(body).toEqual('');
			});
		});

		it('allows null responses', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							path: '/api/test',
							method: 'GET',
							response: { data: null },
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch(`http://localhost:3000/api/test`).then(
					(res) => res.json(),
				);

				expect(response).toBeNull();
			});
		});

		it('adds application/json content-type when response is not undefined', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							path: '/api/test',
							method: 'GET',
							response: { data: {} },
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch(`http://localhost:3000/api/test`);

				expect(response.headers.get('content-type')).toContain(
					'application/json',
				);
			});
		});

		it('adds application/json content-type when response is not undefined and response headers does not contain content-type', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							path: '/api/test',
							method: 'GET',
							response: {
								data: {},
								headers: {
									'Made-Up': 'Header',
								},
							},
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch(`http://localhost:3000/api/test`);

				expect(response.headers.get('made-up')).toEqual('Header');
				expect(response.headers.get('content-type')).toContain(
					'application/json',
				);
			});
		});

		it('does not add application/json content-type when content-type is already defined', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							path: '/api/test',
							method: 'GET',
							response: {
								headers: {
									'Content-Type': 'text/*',
								},
							},
						},
					],
				},
			});

			await serverTest(server, async () => {
				const response = await fetch(`http://localhost:3000/api/test`);

				expect(response.headers.get('content-type')).toContain('text/*');
			});
		});

		it('context works for non GraphQL requests', async () => {
			const initialName = 'Alice';
			const updatedName = 'Bob';

			const server = run({
				scenarios: {
					test: {
						context: { name: initialName },
						mocks: [
							{
								path: '/user',
								method: 'GET',
								response: ({ context }) => ({ data: context.name as string }),
							},
							{
								path: '/user',
								method: 'POST',
								response: ({ body: { name }, updateContext }) => {
									updateContext({ name });

									return { data: name as string };
								},
							},
						],
					},
				},
			});

			await serverTest(server, async () => {
				const name1 = await fetch('http://localhost:3000/user').then((res) =>
					res.json(),
				);
				expect(name1).toEqual(initialName);

				const name2 = await fetch('http://localhost:3000/user', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: updatedName }),
				}).then((res) => res.json());
				expect(name2).toEqual(updatedName);

				const name3 = await fetch('http://localhost:3000/user').then((res) =>
					res.json(),
				);
				expect(name3).toEqual(updatedName);
			});
		});

		it('partial context can be set', async () => {
			const initialName = 'Dean';
			const updatedName = 'Elle';
			const age = 40;

			const server = run({
				scenarios: {
					test: {
						context: { name: initialName, age },
						mocks: [
							{
								path: '/info',
								method: 'GET',
								response: ({ context }) => ({ data: context }),
							},
							{
								path: '/user',
								method: 'POST',
								response: ({ body: { name }, updateContext }) => {
									updateContext({ name });

									return { data: name as string };
								},
							},
						],
					},
				},
			});

			await serverTest(server, async () => {
				const info1 = await fetch('http://localhost:3000/info').then((res) =>
					res.json(),
				);
				expect(info1).toEqual({ name: initialName, age });

				const name = await fetch('http://localhost:3000/user', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: updatedName }),
				}).then((res) => res.json());
				expect(name).toEqual(updatedName);

				const info2 = await fetch('http://localhost:3000/info').then((res) =>
					res.json(),
				);
				expect(info2).toEqual({ name: updatedName, age });
			});
		});

		it('partial context can be set using a function', async () => {
			const name = 'Betty';
			const initialAge = 40;
			const intervalDelayMs = 200;
			const intervalTickCount = 5;
			const timeoutDelayMs = intervalDelayMs * intervalTickCount + 100;

			const server = run({
				scenarios: {
					test: {
						context: { age: initialAge, name },
						mocks: [
							{
								path: '/info',
								method: 'GET',
								response: ({ context }) => ({ data: context }),
							},
							{
								path: '/user',
								method: 'POST',
								response: ({ updateContext }) => {
									const interval = setInterval(() => {
										updateContext(({ age }) => ({ age: (age as number) + 1 }));
									}, intervalDelayMs);
									setTimeout(() => {
										clearInterval(interval);
									}, timeoutDelayMs);

									return { data: null };
								},
							},
						],
					},
				},
			});

			await serverTest(server, async () => {
				const info1 = await fetch('http://localhost:3000/info').then((res) =>
					res.json(),
				);
				expect(info1).toEqual({ name, age: initialAge });

				await fetch('http://localhost:3000/user', {
					method: 'POST',
				});

				await new Promise((resolve) => {
					setTimeout(() => {
						resolve(null);
					}, timeoutDelayMs + 100);
				});

				const info2 = await fetch('http://localhost:3000/info').then((res) =>
					res.json(),
				);
				expect(info2).toEqual({ name, age: initialAge + intervalTickCount });
			});
		});

		it('context works for GraphQL requests', async () => {
			const initialName = 'Alice';
			const updatedName = 'Bob';

			const server = run({
				scenarios: {
					default: {
						context: { name: initialName },
						mocks: [
							{
								path: '/graphql',
								method: 'GRAPHQL',
								operations: [
									{
										type: 'query',
										name: 'GetUser',
										response: ({ context }) => ({
											data: { data: { user: { name: context.name } } },
										}),
									},
									{
										type: 'mutation',
										name: 'UpdateUser',
										response: ({ updateContext, variables: { name } }) => {
											updateContext({ name });

											return {
												data: { data: { updateUser: { name } } },
											};
										},
									},
								],
							},
						],
					},
				},
			});

			await serverTest(server, async () => {
				const query = `
		      query GetUser {
		        user {
		          name
		        }
		      }
		    `;
				const mutation = `
		      mutation UpdateUser($name: String!) {
		        updateUser(name: $name) {
		          name
		        }
		      }
		    `;

				const result1 = await fetch('http://localhost:3000/graphql', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query,
					}),
				}).then((res) => res.json());
				expect((result1 as any).data.user.name).toEqual(initialName);

				const result2 = await fetch('http://localhost:3000/graphql', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query: mutation,
						variables: { name: updatedName },
					}),
				}).then((res) => res.json());
				expect((result2 as any).data.updateUser.name).toEqual(updatedName);

				const result3 = await fetch('http://localhost:3000/graphql', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query,
					}),
				}).then((res) => res.json());
				expect((result3 as any).data.user.name).toEqual(updatedName);
			});
		});

		it('headers are passed to GraphQL functions', async () => {
			const server = run({
				scenarios: {
					test: [
						{
							path: '/api/graphql',
							method: 'GRAPHQL',
							operations: [
								{
									name: 'Headers',
									type: 'query',
									response: ({ headers }) => ({
										data: {
											data: {
												headers,
											},
										},
									}),
								},
							],
						},
					],
				},
			});

			await serverTest(server, async () => {
				const query = `
		      query Headers {
		        headers
		      }
		    `;
				const headers = {
					'content-type': 'application/json',
					'x-trace-token': '8474a2bf-86ef-5276-b7a2-6807ba0fcd83',
				};
				const response: any = await fetch('http://localhost:3000/api/graphql', {
					method: 'POST',
					headers,
					body: JSON.stringify({
						query,
					}),
				}).then((res) => res.json());

				expect(response.data.headers['x-trace-token']).toEqual(
					headers['x-trace-token'],
				);
			});
		});
	});

	describe('scenarios', () => {
		it('override extended paths', async () => {
			const expectedInitialResponse = {};
			const expectedResponse = { something: 'new' };
			const server = run({
				scenarios: {
					default: [
						{
							path: '/test-me',
							method: 'GET',
							response: { data: expectedInitialResponse },
						},
					],
					test: {
						extend: 'default',
						mocks: [
							{
								path: '/test-me',
								method: 'GET',
								response: { data: expectedResponse },
							},
						],
					},
				},
			});

			await serverTest(server, async () => {
				const initialResponse = await fetch(
					'http://localhost:3000/test-me',
				).then((res) => res.json());
				expect(initialResponse).toEqual(expectedInitialResponse);

				await fetch('http://localhost:3000/select-scenario', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ scenarioId: 'test' }),
				});

				const response = await fetch('http://localhost:3000/test-me').then(
					(res) => res.json(),
				);
				expect(response).toEqual(expectedResponse);
			});
		});

		it('GraphQL operations on the same URL are merged', async () => {
			const expectedResponse1 = { data: { a: 1 } };
			const expectedResponse2 = { data: { b: 2 } };
			const expectedResponse3 = { data: { c: 3 } };
			const server = run({
				scenarios: {
					default: [
						{
							path: '/graphql',
							method: 'GRAPHQL',
							operations: [
								{
									name: 'Query1',
									type: 'query',
									response: { data: expectedResponse1 },
								},
								{
									name: 'Query2',
									type: 'query',
								},
							],
						},
					],
					query2: {
						extend: 'default',
						mocks: [
							{
								path: '/graphql',
								method: 'GRAPHQL',
								operations: [
									{
										name: 'Query2',
										type: 'query',
										response: { data: expectedResponse2 },
									},
								],
							},
						],
					},
					query3: {
						extend: 'query2',
						mocks: [
							{
								path: '/graphql',
								method: 'GRAPHQL',
								operations: [
									{
										name: 'Query3',
										type: 'query',
										response: { data: expectedResponse3 },
									},
								],
							},
						],
					},
				},
			});

			await serverTest(server, async () => {
				await fetch('http://localhost:3000/select-scenario', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ scenarioId: 'query3' }),
				});

				const [response1, response2, response3] = await Promise.all([
					fetch('http://localhost:3000/graphql', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							query: 'query Query1 { a }',
						}),
					}).then((res) => res.json()),
					fetch('http://localhost:3000/graphql', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							query: 'query Query2 { b }',
						}),
					}).then((res) => res.json()),
					fetch('http://localhost:3000/graphql', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							query: 'query Query3 { c }',
						}),
					}).then((res) => res.json()),
				]);

				expect(response1).toEqual(expectedResponse1);
				expect(response2).toEqual(expectedResponse2);
				expect(response3).toEqual(expectedResponse3);
			});
		});

		it('select-scenario and scenarios paths can be changed', async () => {
			const initialResponse = { something: 'old' };
			const scenarioResponse = { something: 'new' };
			const server = run({
				scenarios: {
					default: [
						{
							path: '/test-me',
							method: 'GET',
							response: { data: initialResponse },
						},
					],
					test: [
						{
							path: '/test-me',
							method: 'GET',
							response: { data: scenarioResponse },
						},
					],
				},
				options: {
					selectScenarioPath: '/select',
					scenariosPath: '/get-scenarios',
				},
			});

			await serverTest(server, async () => {
				const scenariosResponse = await fetch(
					'http://localhost:3000/get-scenarios',
				).then((res) => res.json());
				expect(Array.isArray(scenariosResponse)).toEqual(true);

				const firstResponse = await fetch('http://localhost:3000/test-me').then(
					(res) => res.json(),
				);
				expect(firstResponse).toEqual(initialResponse);

				await fetch('http://localhost:3000/select', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ scenarioId: 'test' }),
				});

				const secondResponse = await fetch(
					'http://localhost:3000/test-me',
				).then((res) => res.json());
				expect(secondResponse).toEqual(scenarioResponse);
			});
		});

		it('scenario context overrides extended context', async () => {
			const defaultName = 'Alice';
			const scenarioName = 'Bob';
			const email = 'a@b.c';

			const server = run({
				scenarios: {
					default: {
						context: { name: defaultName, email },
						mocks: [
							{
								path: '/user',
								method: 'GET',
								response: ({ context }) => ({
									data: context,
								}),
							},
						],
					},
					test: {
						extend: 'default',
						context: { name: scenarioName },
						mocks: [],
					},
				},
			});

			await serverTest(server, async () => {
				const user1 = await fetch('http://localhost:3000/user').then((res) =>
					res.json(),
				);
				expect(user1).toEqual({ name: defaultName, email });

				await fetch('http://localhost:3000/select-scenario', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ scenarioId: 'test' }),
				});

				const user2 = await fetch('http://localhost:3000/user').then((res) =>
					res.json(),
				);
				expect(user2).toEqual({ name: scenarioName, email });
			});
		});

		it('scenario context adds to extended context', async () => {
			const name = 'Alice';
			const age = 30;

			const server = run({
				scenarios: {
					default: {
						context: { name },
						mocks: [
							{
								path: '/info',
								method: 'GET',
								response: ({ context }) => ({ data: context }),
							},
						],
					},
					test: {
						extend: 'default',
						context: { age },
						mocks: [],
					},
				},
			});

			await serverTest(server, async () => {
				const info1 = await fetch('http://localhost:3000/info').then((res) =>
					res.json(),
				);
				expect(info1).toEqual({ name });

				await fetch('http://localhost:3000/select-scenario', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ scenarioId: 'test' }),
				});

				const info2 = await fetch('http://localhost:3000/info').then((res) =>
					res.json(),
				);
				expect(info2).toEqual({ name, age });
			});
		});
	});

	describe('GET scenarios', () => {
		it('sets the first declared scenario as "selected" and uses scenario names and descriptions as expected', async () => {
			const server = run({
				scenarios: {
					default: {
						name: 'Default',
						description: 'Default description',
						mocks: [],
					},
					test1: { name: 'Test 1', description: 'Description 1', mocks: [] },
					test2: { name: 'Test 2', description: 'Description 2', mocks: [] },
					test3: { name: 'Test 3', description: 'Description 3', mocks: [] },
					test4: { name: 'Test 4', description: 'Description 4', mocks: [] },
				},
			});

			await serverTest(server, async () => {
				const scenariosResponse = await fetch(
					'http://localhost:3000/scenarios',
				).then((res) => res.json());

				expect(scenariosResponse).toEqual([
					{
						id: 'default',
						name: 'Default',
						description: 'Default description',
						selected: true,
					},
					{
						id: 'test1',
						name: 'Test 1',
						description: 'Description 1',
						selected: false,
					},
					{
						id: 'test2',
						name: 'Test 2',
						description: 'Description 2',
						selected: false,
					},
					{
						id: 'test3',
						name: 'Test 3',
						description: 'Description 3',
						selected: false,
					},
					{
						id: 'test4',
						name: 'Test 4',
						description: 'Description 4',
						selected: false,
					},
				]);
			});
		});

		it('returns the correct value for "selected" and defaults name to id', async () => {
			const server = run({
				scenarios: {
					default: [],
					test1: [
						{
							path: '/test-me-1',
							method: 'GET',
						},
					],
					test2: [
						{
							path: '/test-me-2',
							method: 'GET',
						},
					],
					test3: [
						{
							path: '/test-me-3',
							method: 'GET',
						},
					],
					test4: [
						{
							path: '/test-me-4',
							method: 'GET',
						},
					],
				},
			});

			await serverTest(server, async () => {
				await fetch('http://localhost:3000/select-scenario', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ scenarioId: 'test2' }),
				});

				const scenariosResponse = await fetch(
					'http://localhost:3000/scenarios',
				).then((res) => res.json());

				expect(scenariosResponse).toEqual([
					{
						id: 'default',
						name: 'default',
						description: null,
						selected: false,
					},
					{
						id: 'test1',
						name: 'test1',
						description: null,
						selected: false,
					},
					{
						id: 'test2',
						name: 'test2',
						description: null,
						selected: true,
					},
					{
						id: 'test3',
						name: 'test3',
						description: null,
						selected: false,
					},
					{
						id: 'test4',
						name: 'test4',
						description: null,
						selected: false,
					},
				]);
			});
		});
	});

	describe('running multiple scenarios in parallel', () => {
		it('multiple scenario ids can be selected using sms-sceario-id header', async () => {
			const server = run({
				scenarios: {
					default: [],
					a: [
						{
							path: '/test-me',
							method: 'GET',
							response: { data: { a: 1 } },
						},
					],
					b: [
						{
							path: '/test-me',
							method: 'GET',
							// Add delay to make sure they respond at different times
							response: { data: { b: 2 }, delay: 200 },
						},
					],
					c: [
						{
							path: '/test-me',
							method: 'GET',
							response: { data: { c: 3 } },
						},
					],
				},
			});

			await serverTest(server, async () => {
				const scenarios = (await fetch('http://localhost:3000/scenarios').then(
					(res) => res.json(),
				)) as Array<ApiScenario>;

				const [firstScenario] = scenarios;

				// Check that no scenario is seleceted before continuing
				expect(firstScenario.selected).toBe(true);
				expect(['a', 'b', 'c'].includes(firstScenario.id)).toBe(false);

				const responsePromises = [
					fetch('http://localhost:3000/test-me', {
						headers: { 'sms-scenario-id': 'a' },
					}).then((res) => res.json()),
					fetch('http://localhost:3000/test-me', {
						headers: { 'sms-scenario-id': 'b' },
					}).then((res) => res.json()),
					fetch('http://localhost:3000/test-me', {
						headers: { 'sms-scenario-id': 'c' },
					}).then((res) => res.json()),
				];

				const responses = await Promise.all(responsePromises);

				expect(responses).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
			});
		});

		// This test uses the same scenario id, but multiple scenario ids work in the same way
		it('caches up to 10 contexts using sms-context-id header', async () => {
			const defaultUser = 'Zedicus';
			const scenarioId = 'test';

			const server = run({
				scenarios: {
					test: {
						context: {
							user: defaultUser,
						},
						mocks: [
							{
								path: '/api/user',
								method: 'GET',
								response: ({ context }) => ({
									data: context.user as string,
								}),
							},
							{
								path: '/api/user',
								method: 'PUT',
								response: ({ updateContext, body }) => {
									updateContext({ user: body.user });

									return {
										data: body.user as string,
									};
								},
							},
						],
					},
				},
			});

			// Check default context for context ids
			await serverTest(server, async () => {
				expect(await getAllUsers()).toEqual([
					defaultUser,
					defaultUser,
					defaultUser,
					defaultUser,
					defaultUser,
					defaultUser,
					defaultUser,
					defaultUser,
					defaultUser,
					defaultUser,
				]);

				// Update context
				await Promise.all([
					fetch('http://localhost:3000/api/user', {
						headers: {
							'sms-scenario-id': scenarioId,
							'sms-context-id': 'a',
							'content-type': 'application/json',
						},
						method: 'PUT',
						body: JSON.stringify({ user: 'Abigail' }),
					}),
					fetch('http://localhost:3000/api/user', {
						headers: {
							'sms-scenario-id': scenarioId,
							'sms-context-id': 'b',
							'content-type': 'application/json',
						},
						method: 'PUT',
						body: JSON.stringify({ user: 'Betty' }),
					}),
					fetch('http://localhost:3000/api/user', {
						headers: {
							'sms-scenario-id': scenarioId,
							'sms-context-id': 'c',
							'content-type': 'application/json',
						},
						method: 'PUT',
						body: JSON.stringify({ user: 'Charlotte' }),
					}),
					fetch('http://localhost:3000/api/user', {
						headers: {
							'sms-scenario-id': scenarioId,
							'sms-context-id': 'd',
							'content-type': 'application/json',
						},
						method: 'PUT',
						body: JSON.stringify({ user: 'Daisy' }),
					}),
					fetch('http://localhost:3000/api/user', {
						headers: {
							'sms-scenario-id': scenarioId,
							'sms-context-id': 'e',
							'content-type': 'application/json',
						},
						method: 'PUT',
						body: JSON.stringify({ user: 'Erin' }),
					}),
					fetch('http://localhost:3000/api/user', {
						headers: {
							'sms-scenario-id': scenarioId,
							'sms-context-id': 'f',
							'content-type': 'application/json',
						},
						method: 'PUT',
						body: JSON.stringify({ user: 'Fred' }),
					}),
					fetch('http://localhost:3000/api/user', {
						headers: {
							'sms-scenario-id': scenarioId,
							'sms-context-id': 'g',
							'content-type': 'application/json',
						},
						method: 'PUT',
						body: JSON.stringify({ user: 'George' }),
					}),
					fetch('http://localhost:3000/api/user', {
						headers: {
							'sms-scenario-id': scenarioId,
							'sms-context-id': 'h',
							'content-type': 'application/json',
						},
						method: 'PUT',
						body: JSON.stringify({ user: 'Harrison' }),
					}),
					fetch('http://localhost:3000/api/user', {
						headers: {
							'sms-scenario-id': scenarioId,
							'sms-context-id': 'i',
							'content-type': 'application/json',
						},
						method: 'PUT',
						body: JSON.stringify({ user: 'Ian' }),
					}),
					fetch('http://localhost:3000/api/user', {
						headers: {
							'sms-scenario-id': scenarioId,
							'sms-context-id': 'j',
							'content-type': 'application/json',
						},
						method: 'PUT',
						body: JSON.stringify({ user: 'John' }),
					}),
				]);

				// 10 contexts are being cached
				expect(await getAllUsers()).toEqual([
					'Abigail',
					'Betty',
					'Charlotte',
					'Daisy',
					'Erin',
					'Fred',
					'George',
					'Harrison',
					'Ian',
					'John',
				]);

				await fetch('http://localhost:3000/api/user', {
					headers: {
						'sms-scenario-id': scenarioId,
						// 11th context id
						'sms-context-id': 'k',
						'content-type': 'application/json',
					},
					method: 'PUT',
					body: JSON.stringify({ user: 'Kevin' }),
				});

				const users = await getAllUsers();

				// Check default cache size is reached
				expect(users).includes(defaultUser);
			});

			async function getAllUsers() {
				return Promise.all([
					fetch('http://localhost:3000/api/user', {
						headers: { 'sms-scenario-id': scenarioId, 'sms-context-id': 'a' },
					}).then((res) => res.json()),
					fetch('http://localhost:3000/api/user', {
						headers: { 'sms-scenario-id': scenarioId, 'sms-context-id': 'b' },
					}).then((res) => res.json()),
					fetch('http://localhost:3000/api/user', {
						headers: { 'sms-scenario-id': scenarioId, 'sms-context-id': 'c' },
					}).then((res) => res.json()),
					fetch('http://localhost:3000/api/user', {
						headers: { 'sms-scenario-id': scenarioId, 'sms-context-id': 'd' },
					}).then((res) => res.json()),
					fetch('http://localhost:3000/api/user', {
						headers: { 'sms-scenario-id': scenarioId, 'sms-context-id': 'e' },
					}).then((res) => res.json()),
					fetch('http://localhost:3000/api/user', {
						headers: { 'sms-scenario-id': scenarioId, 'sms-context-id': 'f' },
					}).then((res) => res.json()),
					fetch('http://localhost:3000/api/user', {
						headers: { 'sms-scenario-id': scenarioId, 'sms-context-id': 'g' },
					}).then((res) => res.json()),
					fetch('http://localhost:3000/api/user', {
						headers: { 'sms-scenario-id': scenarioId, 'sms-context-id': 'h' },
					}).then((res) => res.json()),
					fetch('http://localhost:3000/api/user', {
						headers: { 'sms-scenario-id': scenarioId, 'sms-context-id': 'i' },
					}).then((res) => res.json()),
					fetch('http://localhost:3000/api/user', {
						headers: { 'sms-scenario-id': scenarioId, 'sms-context-id': 'j' },
					}).then((res) => res.json()),
				]);
			}
		});
	});
});

function getStartTime() {
	return process.hrtime();
}

function getDuration(startTime: [number, number]) {
	const hrend = process.hrtime(startTime);
	return hrend[0] * 1000 + hrend[1] / 1000000;
}

function serverTest(server: ServerWithKill, fn: () => void) {
	return new Promise((resolve, reject) => {
		server.on('listening', async () => {
			try {
				await fn();
				server.kill(() => {
					resolve(null);
				});
			} catch (error) {
				server.kill(() => {
					reject(error);
				});
			}
		});
	});
}
