/**
 * OpenAPI 3.1 document.
 *
 * Phase 0/1 ships a minimal but valid spec describing the auth surface.
 * Subsequent phases append their resources here, keeping a single source of
 * truth for the web frontend and the future mobile client.
 */
export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'ASK Blue Metal API',
    version: '0.1.0',
    description:
      'Weighbridge Integrated Production & Billing Management System. ' +
      'This document is the contract consumed by the React web app and the future mobile app.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
              requestId: { type: 'string' },
            },
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 64 },
          password: { type: 'string', minLength: 1, maxLength: 256 },
        },
      },
      PublicUser: {
        type: 'object',
        required: ['id', 'username', 'email', 'roles', 'permissions', 'status'],
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'LOCKED'] },
          roles: { type: 'array', items: { type: 'string' } },
          permissions: { type: 'array', items: { type: 'string' } },
          lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      LoginResponse: {
        type: 'object',
        required: ['accessToken', 'accessTokenExpiresIn', 'user'],
        properties: {
          accessToken: { type: 'string' },
          accessTokenExpiresIn: { type: 'integer', description: 'Seconds until expiry' },
          refreshToken: {
            type: 'string',
            description: 'Returned only when X-Client-Type: mobile is set',
          },
          user: { $ref: '#/components/schemas/PublicUser' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Liveness probe',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate with username and password',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate refresh token and obtain a new access token',
        responses: {
          '200': {
            description: 'Refreshed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
            },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Revoke the current refresh-token family',
        responses: { '204': { description: 'Logged out' } },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Current authenticated principal',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' } },
      },
    },
  },
} as const;
