// ── Core entities ────────────────────────────────────────────
CREATE (u:User {id: 'u1', externalId: 'alice', createdAt: datetime()});
CREATE (a:Agent {id: 'agent-1', name: 'CogMem', version: '0.1.0'});
CREATE (u)-[:OWNS]->(s:Session {id: 'sess-1', userId: 'u1', startedAt: datetime(), status: 'active'});
CREATE (s)-[:HAS_MESSAGE]->(m:Message {id: 'msg-1', role: 'user', content: 'I love Neo4j Cypher!', ts: datetime()});
CREATE (m)-[:FROM]->(u);
CREATE (m)-[:TO]->(a);

// ── Document with embedding (placeholder vector) ────────────
CREATE (d:Document {
  id: 'doc-1',
  title: 'Intro to Cypher',
  content: 'Cypher is Neo4j query language...',
  embedding: [0.12, -0.45, 0.78, ...]   // 1536 dims
});

// ── Entity resolution seed ──────────────────────────────────
CREATE (e:Entity {id: 'ent-neo4j', type: 'Technology', name: 'Neo4j', nameEmbedding: [0.01, 0.02, ...]});
CREATE (m)-[:MENTIONS {confidence: 0.99}]->(e);