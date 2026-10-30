// ── Constraints ──────────────────────────────────────────────
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT session_id IF NOT EXISTS FOR (s:Session) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT doc_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;

// ── Indexes ──────────────────────────────────────────────────
CREATE INDEX user_ext_id IF NOT EXISTS FOR (u:User) ON (u.externalId);
CREATE INDEX session_user IF NOT EXISTS FOR (s:Session) ON (s.userId);
CREATE INDEX message_ts IF NOT EXISTS FOR (m:Message) ON (m.ts);
CREATE INDEX event_type IF NOT EXISTS FOR (e:Event) ON (e.type);

// ── Vector Indexes ───────────────────────────────────────────
CREATE VECTOR INDEX doc_emb_idx IF NOT EXISTS
FOR (d:Document) ON (d.embedding)
OPTIONS { vector.dimensions: 1536, vector.similarity_function: 'cosine' };

CREATE VECTOR INDEX msg_emb_idx IF NOT EXISTS
FOR (m:Message) ON (m.embedding)
OPTIONS { vector.dimensions: 1536, vector.similarity_function: 'cosine' };

CREATE VECTOR INDEX ent_name_idx IF NOT EXISTS
FOR (e:Entity) ON (e.nameEmbedding)
OPTIONS { vector.dimensions: 1536, vector.similarity_function: 'cosine' };