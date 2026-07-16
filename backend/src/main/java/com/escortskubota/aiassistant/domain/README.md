## Domain layer

Entities live under `com.escortskubota.aiassistant.domain`. Phase-1 entities:

- `User`, `Role`, `UserRole` — authentication & RBAC
- `Tractor` — recommender catalogue
- `Complaint` — customer service ticket
- `KbDocument`, `KbChunk` — RAG knowledge base (chunks store a `vector(3072)` embedding)
- `ChatConversation`, `ChatMessage` — grounded chat history with citations
- `AuditEvent` — administrative audit trail

The full JPA entity classes are generated in Phase 2 alongside the RAG implementation
so entity boundaries stay honest to the AI/service layer. Migrations in
`src/main/resources/db/migration/` are the source of truth for schema.
