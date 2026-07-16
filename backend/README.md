# Escorts Kubota AI Service Assistant — Spring Boot Backend

Enterprise-grade Java 21 backend for the **Escorts Kubota AI Service Assistant** platform.
This is the reference implementation of the Spring Boot stack that mirrors the same
domain served in the live React frontend (which runs on Lovable Cloud for the demo).

> The React frontend can point at either the live Cloud backend OR this Spring Boot
> service by setting `VITE_API_BASE_URL`. Both share the same conceptual data model.

## Stack

| Concern | Choice |
| --- | --- |
| Language / Runtime | **Java 21** (LTS) |
| Framework | **Spring Boot 3.3.x** |
| Web | Spring Web MVC + Bean Validation |
| Security | Spring Security + **JWT** (HS256) + Role-based Access |
| Persistence | Spring Data JPA / Hibernate |
| Database | **PostgreSQL 16** + **pgvector** extension |
| Migrations | Flyway |
| AI | **Spring AI** — OpenAI-compatible client pointed at Lovable AI Gateway |
| Vector store | **Qdrant** (docker-compose) — falls back to pgvector when disabled |
| Docs | springdoc-openapi (Swagger UI at `/swagger-ui.html`) |
| Build | Maven |
| Tests | JUnit 5 + Mockito + Testcontainers |
| Container | Multi-stage Dockerfile (Eclipse Temurin 21 JRE) |
| Orchestration | docker-compose (api + postgres + qdrant + nginx) |
| CI | GitHub Actions |

## Architecture (clean / hexagonal-lite)

```
com.escortskubota.aiassistant
├── AiAssistantApplication.java     # boot entry point
├── config/                         # Spring configs (security, openapi, cors, ai)
├── security/                       # JWT service, filter, method-level RBAC
├── domain/                         # JPA entities (aggregate roots)
├── repository/                     # Spring Data JPA repositories
├── dto/                            # Request / response DTOs (Jakarta validation)
├── mapper/                         # Entity <-> DTO mappers
├── service/                        # Business logic (transactional)
│   ├── ai/                         # Chat, RAG, embeddings
│   └── ...
├── controller/                     # @RestController layer
└── exception/                      # @RestControllerAdvice global handling
```

## Modules → REST surface

| Domain module | Base path |
| --- | --- |
| Authentication | `/api/v1/auth` |
| Users & Roles | `/api/v1/users`, `/api/v1/admin/roles` |
| AI Chat + RAG | `/api/v1/chat` |
| Knowledge Base | `/api/v1/kb/documents` |
| Complaints & Tickets | `/api/v1/complaints`, `/api/v1/tickets` |
| Recommendations | `/api/v1/recommend` |
| Analytics (admin) | `/api/v1/admin/analytics` |

## Running locally

### 1. Prerequisites
- Docker + Docker Compose
- (Optional) JDK 21 + Maven 3.9 for non-container dev

### 2. Configure secrets

```bash
cp .env.example .env
# then edit .env — set LOVABLE_API_KEY and a strong JWT_SECRET
```

### 3. Start everything

```bash
docker compose up --build
```

Services:
- API — <http://localhost:8080>
- Swagger UI — <http://localhost:8080/swagger-ui.html>
- Postgres — `localhost:5432` (db `escorts_kubota`, user `postgres`)
- Qdrant — <http://localhost:6333/dashboard>
- Nginx (edge) — <http://localhost>

### 4. Native (non-Docker) dev

```bash
./mvnw spring-boot:run
```

Requires a local Postgres with the `vector` extension installed.

## AI configuration

Uses **Spring AI** with an OpenAI-compatible client. Point it at the Lovable AI
Gateway so no direct OpenAI key is required:

```yaml
spring:
  ai:
    openai:
      base-url: https://ai.gateway.lovable.dev
      api-key: ${LOVABLE_API_KEY}
      chat:
        options:
          model: google/gemini-3-flash-preview
      embedding:
        options:
          model: google/gemini-embedding-001
```

Headers can be overridden in `AiConfig.java` to send `Lovable-API-Key` when preferred.

## Deployment

- **Docker image**: multi-stage, non-root, distroless-friendly runtime.
- **GitHub Actions** (`.github/workflows/ci.yml`) — build, test, containerise, push to GHCR.
- **Cloud target**: Compatible with AWS ECS/Fargate, Azure Container Apps, and Kubernetes.

## Testing

```bash
./mvnw test
```

Unit tests: services with Mockito. Integration tests: Testcontainers (Postgres + Qdrant).

## Documentation

- Architecture diagram — `docs/architecture.md`
- ER diagram — `docs/er-diagram.md`
- API — Swagger UI (runtime) + `docs/api.md`
- Deployment — `docs/deploy.md`

## Status

**Phase 1 (this commit):** project scaffold, security, JWT, users & roles, RBAC method security, Swagger, health checks, docker-compose, CI.

**Next phases:** RAG ingestion & chat, complaints service, recommendation engine, analytics.
