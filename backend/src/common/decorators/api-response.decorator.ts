import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

export interface ApiCommonResponseOptions {
  /** Summary for the endpoint (appears in Swagger UI) */
  summary: string;
  /** Description (defaults to summary if not provided) */
  description?: string;
  /** HTTP status code (defaults to 200) */
  status?: number;
  /** Response type (a DTO or entity class). When provided, Swagger will generate the proper schema. */
  type?: unknown;
  /** Whether the response is an array of `type` items */
  isArray?: boolean;
  /** Whether authentication is required (defaults to true). When true, adds @ApiBearerAuth(). */
  auth?: boolean;
  /** Whether the response is paginated (wraps in { success, data: { items, meta }, timestamp }) */
  pagination?: boolean;
}

/**
 * Composable Swagger decorator that bundles `@ApiOperation`, `@ApiResponse`,
 * and optionally `@ApiBearerAuth()` into a single call.
 *
 * Updated for Phase 1: All success responses are wrapped in
 * `{ success: true, data: T, timestamp }` envelope.
 */
export function ApiCommonResponse(options: ApiCommonResponseOptions): MethodDecorator {
  const {
    summary,
    description,
    status = 200,
    type,
    isArray = false,
    auth = true,
    pagination = false,
  } = options;

  const desc = description ?? summary;

  const decorators: (MethodDecorator | ClassDecorator)[] = [
    ApiOperation({ summary, description: desc }),
  ];

  if (type) {
    if (pagination) {
      decorators.push(
        ApiResponse({
          status,
          description: desc,
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: { $ref: `#/components/schemas/${(type as { name: string }).name}` },
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer', example: 1 },
                      limit: { type: 'integer', example: 10 },
                      total: { type: 'integer', example: 100 },
                      totalPages: { type: 'integer', example: 10 },
                    },
                  },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        }),
      );
    } else if (isArray) {
      decorators.push(
        ApiResponse({
          status,
          description: desc,
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: { $ref: `#/components/schemas/${(type as { name: string }).name}` },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        }),
      );
    } else {
      decorators.push(
        ApiResponse({
          status,
          description: desc,
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                $ref: `#/components/schemas/${(type as { name: string }).name}`,
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        }),
      );
    }
  } else {
    decorators.push(
      ApiResponse({
        status,
        description: desc,
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      }),
    );
  }

  if (auth) {
    decorators.push(ApiBearerAuth());
  }

  return applyDecorators(...decorators) as MethodDecorator;
}
