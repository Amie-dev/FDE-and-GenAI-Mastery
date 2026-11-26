// schema.cypher — DDL: constraints, indexes, vector indexes
// Run via: npm run bootstrap

// Unique constraints
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT event_ts_unique IF NOT EXISTS
FOR (e:Event) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT entity_name_unique IF NOT EXISTS
FOR (e:Entity) REQUIRE e.name IS UNIQUE;

CREATE CONSTRAINT document_id_unique IF NOT EXISTS
FOR (d:Document) REQUIRE d.id IS UNIQUE;

// Preference temporal uniqueness
CREATE CONSTRAINT preference_key_ts_unique IF NOT EXISTS
FOR (p:Preference) REQUIRE (p.userId, p.key, p.validFrom) IS UNIQUE;

// Hot path indexes
CREATE INDEX user_name_idx IF NOT EXISTS
FOR (u:User) ON (u.name);

CREATE INDEX event_ts_idx IF NOT EXISTS
FOR (e:Event) ON (e.ts);

CREATE INDEX session_created_idx IF NOT EXISTS
FOR (s:Session) ON (s.createdAt);

CREATE INDEX preference_key_idx IF NOT EXISTS
FOR (p:Preference) ON (p.userId, p.key, p.validFrom);

// Vector index (1536-dim cosine for OpenAI text-embedding-3-small)
CREATE VECTOR INDEX doc_emb_idx IF NOT EXISTS
FOR (d:Document) ON (d.embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: "cosine"
  }
};

CREATE VECTOR INDEX entity_name_emb_idx IF NOT EXISTS
FOR (e:Entity) ON (e.nameEmbedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: "cosine"
  }
};
