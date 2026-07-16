# Architecture — Escorts Kubota AI Service Assistant

```text
                    ┌────────────────────────┐
                    │   React Frontend       │
                    │  (TanStack Start / TS) │
                    └───────────┬────────────┘
                                │ HTTPS / JWT
                    ┌───────────▼────────────┐
                    │        Nginx           │
                    │   (TLS, rate-limit)    │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │  Spring Boot 3 (JDK21) │
                    │  ┌──────────────────┐  │
                    │  │ Controllers      │  │
                    │  │ (REST + Swagger) │  │
                    │  ├──────────────────┤  │
                    │  │ Services         │  │
                    │  │  ├─ AuthService  │  │
                    │  │  ├─ ChatService  │  │
                    │  │  ├─ RagService   │  │
                    │  │  ├─ ComplaintSvc │  │
                    │  │  └─ RecommendSvc │  │
                    │  ├──────────────────┤  │
                    │  │ Repositories(JPA)│  │
                    │  └──────────────────┘  │
                    └────┬────────────┬──────┘
                         │            │
              ┌──────────▼─┐     ┌────▼──────────────┐
              │ PostgreSQL │     │  Lovable AI       │
              │  + pgvector│     │  Gateway          │
              │  (schema,  │     │  (chat, embed,    │
              │   RAG idx) │     │   STT, TTS)       │
              └────────────┘     └───────────────────┘
```

## Layers

1. **Controller** — HTTP boundary. DTO in / DTO out. Bean-Validation on requests.
2. **Service** — transactional business logic; single-responsibility.
3. **Repository** — Spring Data JPA; no cross-aggregate queries.
4. **Domain** — JPA entities; no framework leaks upward.

## Security

- **Authentication**: BCrypt-hashed passwords, JWT (HS256) with 60-min TTL.
- **Authorization**: `@PreAuthorize("hasRole('X')")` on every mutating admin endpoint.
- **Transport**: HTTPS terminated at Nginx (production). CORS locked to known origins.
- **Rate-limiting**: Nginx `limit_req_zone` (see nginx.conf) — Phase 2 adds Bucket4j for per-user API limits.

## AI / RAG pipeline

```
Upload PDF ─► Chunk (Spring AI PdfDocumentReader, 500 tokens/chunk, 50 overlap)
           ─► Embed (google/gemini-embedding-001 via Lovable AI Gateway)
           ─► Store in pgvector (kb_chunks.embedding)
User asks  ─► Embed question ─► pgvector similarity search (top-k=5)
           ─► Compose prompt with retrieved context
           ─► google/gemini-3-flash-preview ─► answer + citations
```

## Deployment

- Docker image published to GHCR by GitHub Actions on `main`.
- Deploy target: AWS ECS/Fargate (or Azure Container Apps).
- 12-factor: config via environment (see `.env.example`).
