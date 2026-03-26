import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ServiceError } from '../services/user.service';
import { ZodError } from 'zod';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(
    (
      error: FastifyError | ServiceError | ZodError,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => {
      // Zod validation errors
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.');
          if (!details[path]) details[path] = [];
          details[path].push(issue.message);
        }
        return reply.status(422).send({
          statusCode: 422,
          error: 'Validation Error',
          message: 'Request validation failed',
          details,
        });
      }

      // Service-level errors (known)
      if (error instanceof ServiceError) {
        return reply.status(error.statusCode).send({
          statusCode: error.statusCode,
          error: error.name,
          message: error.message,
        });
      }

      // Fastify validation errors
      if ('validation' in error && error.validation) {
        return reply.status(422).send({
          statusCode: 422,
          error: 'Validation Error',
          message: error.message,
        });
      }

      // Rate limit errors
      if (error.statusCode === 429) {
        return reply.status(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
        });
      }

      // Unexpected errors — log full details, return safe message
      request.log.error({ err: error, reqId: request.id }, 'Unhandled error');

      const statusCode = error.statusCode ?? 500;
      const isProduction = process.env.NODE_ENV === 'production';
      return reply.status(statusCode).send({
        statusCode,
        error: 'Internal Server Error',
        message: isProduction ? 'An unexpected error occurred' : error.message,
      });
    },
  );
}
