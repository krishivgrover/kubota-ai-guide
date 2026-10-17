# Escorts Kubota AI Service Assistant

An enterprise-grade AI customer support platform for **Escorts Kubota Pvt. Ltd.** — grounded RAG chat over service manuals, complaint & ticket management, tractor recommendations with EMI planning, service appointment scheduling, photo-based fault diagnosis, voice support, and multilingual UI.

> **Live demo:** https://kubota-ai-guide.lovable.app

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Repository Layout](#repository-layout)
- [Tech Stack](#tech-stack)
- [Getting Started — Frontend](#getting-started--frontend)
- [Getting Started — Spring Boot Backend](#getting-started--spring-boot-backend)
- [Environment Variables](#environment-variables)
- [API Surface](#api-surface)
- [MCP Agent Integrations](#mcp-agent-integrations)
- [Security Model](#security-model)
- [Testing & CI](#testing--ci)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

The platform serves four personas — **Customer**, **Dealer**, **Service Engineer**, and **Admin** — through a single role-aware React application. The live demo runs on a managed PostgreSQL backend (with `pgvector`) and the Lovable AI Gateway; a parallel **Spring Boot 3 / Java 21** reference backend lives in [`backend/`](backend/) for self-hosted, on-premise, or cloud deployment.

## Features

| Area | Highlights |
| --- | --- |
| **RAG Knowledge Base** | PDF manual ingestion → chunking → embeddings (`pgvector`, HNSW index) → grounded chat with page-level citations |
| **AI Chat Assistant** | Streaming responses, voice input (STT) and spoken replies (TTS), multilingual replies (EN / HI / MR / PA / TA) |
| **Complaints & Tickets** | Auto-incrementing ticket numbers (`EK-000001`), AI triage (category / priority / summary), internal staff notes, threaded messages |
| **Service Appointments** | Booking flow, status lifecycle (`requested → scheduled → in_progress → completed`), auto-logged customer update feed, realtime updates |
| **Product Recommender** | Scores tractor models against land size, budget, and use case |
| **EMI Calculator** | Down payment, tenure (12–84 mo), interest rate, processing fee, amortization schedule, tenure comparison |
| **Photo Diagnosis** | Upload/capture a photo of tractor or part; vision model analyzes the fault and suggests next steps |
| **Dealer Locator** | Geolocation + Haversine distance ranking (contact details restricted to staff) |
| **Warranty & Maintenance** | Warranty registration and maintenance schedule tracking |
| **Admin Analytics** | KPI tiles, ticket status/priority breakdowns, knowledge-base coverage |
| **RBAC** | Role-based access control enforced in the database (RLS) and in application code |
| **MCP Server** | OAuth-protected MCP endpoint exposing 7 agent tools (tickets, appointments, warranties, catalog, dealers) |

## Architecture

```text
┌──────────────────────────────┐        ┌──────────────────────────────┐
│   React Frontend (TS)        │  HTTPS │  Spring Boot 3 (Java 21)     │
│   TanStack Start + Router    │◄──────►│  JWT + RBAC + Spring AI      │
│   Tailwind v4 + shadcn/ui    │  JSON  │  (backend/ — self-hosted)    │
└──────────────┬───────────────┘        └──────────────┬───────────────┘
               │                                       │
      ┌────────▼─────────┐                   ┌─────────▼─────────┐
      │ Lovable Cloud    │                   │ PostgreSQL 16     │
      │ PostgreSQL       │                   │ + pgvector        │
      │ + pgvector (RLS) │                   │ + Qdrant (opt.)   │
      └────────┬─────────┘                   └───────────────────┘
               │
      ┌────────▼─────────────────────┐
      │ Lovable AI Gateway           │
      │ chat · embeddings · vision · │
      │ STT · TTS                    │
      └──────────────────────────────┘
```

Two interchangeable backends serve the same domain model:

1. **Lovable Cloud (live demo)** — managed Postgres + Row Level Security, server functions via TanStack Start, AI through the Lovable AI Gateway (no API key management).
2. **Spring Boot (`backend/`)** — production-grade Java service with JWT auth, Flyway migrations, Spring AI RAG pipeline, Docker Compose orchestration (API + Postgres/pgvector + Qdrant + Nginx), and GitHub Actions CI. Point the frontend at it with `VITE_API_BASE_URL`.

## Repository Layout

```text
.
├── src/                        # React app (TanStack Start, file-based routing)
│   ├── routes/                 # Pages: landing, auth, dashboard/* per role, api/*
│   ├── components/             # Shared UI (dashboard shell, etc.)
│   ├── lib/                    # Server functions (tickets, catalog, ingest, i18n)
│   │   └── mcp/tools/          # MCP agent tool implementations
│   ├── hooks/                  # use-auth, use-mobile
│   ├── integrations/           # Generated DB/AI client wrappers
│   └── styles.css              # Design system (Escorts Kubota brand tokens)
├── backend/                    # Spring Boot 3 / Java 21 reference backend
│   ├── src/main/java/...       # Controller → Service → Repository → Domain
│   ├── src/main/resources/     # application.yml, Flyway migrations (V1__init.sql)
│   ├── docs/                   # architecture, ER diagram, deploy notes
│   ├── docker-compose.yml      # api + postgres(pgvector) + qdrant + nginx
│   ├── Dockerfile              # Multi-stage, non-root runtime image
│   └── README.md               # Backend-specific setup & docs
├── supabase/                   # Project configuration (auto-generated)
├── .github/workflows/          # CI: backend build/test + Docker publish to GHCR
├── public/                     # robots.txt, llms.txt, favicon
└── README.md
```

## Tech Stack

**Frontend:** React 19 · TypeScript · TanStack Start & Router · TanStack Query · Tailwind CSS v4 · shadcn/ui · Recharts · AI SDK (streaming chat) · `unpdf` (PDF parsing) · react-markdown

**Live backend:** Lovable Cloud (managed PostgreSQL 16 + `pgvector`, Row Level Security, Auth, Storage, Realtime) · Lovable AI Gateway

**Java backend:** Java 21 · Spring Boot 3.3 · Spring Security + JWT · Spring Data JPA · Flyway · Spring AI (OpenAI-compatible client → Lovable AI Gateway) · pgvector / Qdrant · springdoc-openapi · Testcontainers · Maven

## Getting Started — Frontend

> The frontend is developed inside Lovable; the steps below cover running it locally against the cloud backend.

```bash
# install
bun install        # or: npm install

# dev server (http://localhost:8080)
bun run dev

# production build
bun run build

# lint / format
bun run lint
bun run format
```

Environment variables live in `.env` (see [Environment Variables](#environment-variables)).

## Getting Started — Spring Boot Backend

```bash
cd backend

# 1. Configure secrets
cp .env.example .env
#    edit .env — set LOVABLE_API_KEY and a strong JWT_SECRET

# 2. Start the full stack (API + Postgres/pgvector + Qdrant + Nginx)
docker compose up --build

# API:        http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui.html
# Qdrant:     http://localhost:6333/dashboard

# Native (non-Docker) dev — needs a local Postgres with `vector` extension
./mvnw spring-boot:run

# Tests (unit + Testcontainers integration)
./mvnw test
```

Full backend documentation: [`backend/README.md`](backend/README.md).

## Environment Variables

### Frontend (`.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Cloud database URL (auto-generated) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable anon key (auto-generated) |
| `VITE_SUPABASE_PROJECT_ID` | Cloud project ID (auto-generated) |
| `VITE_API_BASE_URL` | *Optional.* Point the frontend at the Spring Boot backend instead of the cloud backend |

### Backend (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `LOVABLE_API_KEY` | Lovable AI Gateway key (chat, embeddings, vision, STT, TTS) |
| `JWT_SECRET` | Signing secret for HS256 auth tokens |
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | Postgres connection |
| `QDRANT_HOST` / `QDRANT_PORT` | Optional Qdrant vector store |

See [`backend/.env.example`](backend/.env.example) for the full list. **Never commit real secrets** — `.env` is gitignored.

## API Surface

### Live backend (TanStack Start)

| Route | Purpose |
| --- | --- |
| `POST /api/chat` | Streaming RAG chat with citations (`X-Lang` header selects reply language) |
| `POST /api/diagnose` | Vision-based photo diagnosis |
| `POST /api/stt` | Speech-to-text |
| `POST /api/tts` | Text-to-speech |
| `GET /sitemap.xml` | Dynamic XML sitemap |
| `/mcp`, `/.mcp/*` | OAuth-protected MCP server (tool listing + invocation) |

### Spring Boot backend

| Module | Base path |
| --- | --- |
| Authentication | `/api/v1/auth` |
| Users & Roles | `/api/v1/users`, `/api/v1/admin/roles` |
| AI Chat + RAG | `/api/v1/chat` |
| Knowledge Base | `/api/v1/kb/documents` |
| Complaints & Tickets | `/api/v1/complaints`, `/api/v1/tickets` |
| Recommendations | `/api/v1/recommend` |
| Analytics (admin) | `/api/v1/admin/analytics` |

Interactive docs at `/swagger-ui.html` when the backend runs.

## MCP Agent Integrations

The app exposes an **OAuth-protected MCP (Model Context Protocol) server** so external AI agents can act on behalf of signed-in users:

| Tool | Description |
| --- | --- |
| `list_my_tickets` / `create_ticket` | Read and file support tickets |
| `list_my_appointments` / `book_appointment` | Read and schedule service visits |
| `list_my_warranties` | Warranty lookup |
| `search_tractors` | Catalog search |
| `find_dealers` | Dealer directory (contact-free view) |

Discovery at `/.mcp/list-tools`, invocation at `/.mcp/invoke-tool/{tool}`; consent flows through `/.lovable/oauth/consent`.

## Security Model

- **Row Level Security** on every application table — customers see only their own tickets/appointments; dealers and engineers see assigned work; contact info on `dealers` is staff-only with a contact-free `dealers_directory` view for everyone else.
- **Role-based access control** via `user_roles` (`customer`, `dealer`, `service_engineer`, `admin`); `SECURITY DEFINER` helper functions (`has_role`, `is_staff`, `can_access_ticket`) back the RLS policies.
- **JWT (HS256, 60-min TTL)** + BCrypt password hashing + `@PreAuthorize` method security in the Spring Boot backend.
- **Rate limiting** at the Nginx edge (backend deployment).
- **Storage** (`manuals` bucket) readable by staff roles only.
- Immutable `service_appointment_updates` feed (append-only audit of customer-visible status changes).

## Testing & CI

- **Backend unit tests** — JUnit 5 + Mockito; **integration tests** — Testcontainers (Postgres + Qdrant).
- **GitHub Actions** (`.github/workflows/backend-ci.yml`): on `main` — build & test with Maven, then build and push the Docker image to GHCR.
- Frontend: ESLint + Prettier (`bun run lint` / `bun run format`).

## Deployment

| Path | Target |
| --- | --- |
| Frontend + Cloud backend | Published via Lovable → https://kubota-ai-guide.lovable.app |
| Spring Boot backend | Docker image from GHCR → AWS ECS/Fargate, Azure Container Apps, or Kubernetes |

The backend is 12-factor: all configuration via environment variables. See [`backend/docs/deploy.md`](backend/docs/deploy.md).

## Documentation

| Document | Location |
| --- | --- |
| Backend overview & setup | [`backend/README.md`](backend/README.md) |
| Architecture diagram | [`backend/docs/architecture.md`](backend/docs/architecture.md) |
| ER diagram | [`backend/docs/er-diagram.md`](backend/docs/er-diagram.md) |
| Deployment guide | [`backend/docs/deploy.md`](backend/docs/deploy.md) |
| API reference | Swagger UI (`/swagger-ui.html` on a running backend) |
| AI-crawler summary | [`public/llms.txt`](public/llms.txt) |

## License

© Escorts Kubota Pvt. Ltd. All rights reserved. Internal / partner use only.
