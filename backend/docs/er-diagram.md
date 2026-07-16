# ER Diagram

```text
        users ────────< user_roles >──────── roles
          │
          ├──< complaints (customer_id, assignee_id → users)
          ├──< chat_conversations ───< chat_messages
          ├──< kb_documents (uploaded_by)
          │       │
          │       └──< kb_chunks (embedding vector(3072))
          └──< audit_events (actor_id)

        tractors  (catalogue, referenced by complaints.tractor_model)
```

See `src/main/resources/db/migration/V1__init.sql` for column-level detail.
