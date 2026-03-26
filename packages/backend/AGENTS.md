# Backend Agent Rules

## Architecture
- Routes are thin: parse input → call service → return result
- Business logic ONLY in services/
- Database queries ONLY in repositories/ via TypeORM
- NEVER use TypeORM EntityManager or getRepository() in services
- All cache operations through lib/cache.ts — NEVER import ioredis directly

## Fastify Patterns
- Routes use plugin pattern: export default async function(app: FastifyInstance)
- Request validation via Zod schemas from @agent-first-stack/shared
- Pino logger via request.log or app.log — NEVER console.log

## Redis
- Redis is OPTIONAL — all code must work without it
- lib/cache.ts provides no-op fallback automatically

## Testing
- Unit tests in __tests__/ mirroring src/ structure
- Mock repositories in service tests
- Mock services in route tests
- Run vitest before committing

## File Naming
- Entities: PascalCase (User.ts)
- Everything else: kebab-case (user.service.ts, user.repository.ts)
