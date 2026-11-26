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

// ── Bitemporal Ontology Seed (Chapter 09) ───────────────────
CREATE (org:Organization {id: 'org-acme', name: 'Acme Corp'});
CREATE (alice:Person {id: 'per-alice', name: 'Alice Chen'});
CREATE (bob:Person {id: 'per-bob', name: 'Bob Patel'});
CREATE (sys:System {id: 'sys-payments', name: 'Payments Gateway'});
CREATE (chg22:Change {id: 'chg-2022-01', title: 'Enable TLS 1.3'});
CREATE (chg24:Change {id: 'chg-2024-01', title: 'Migrate to Multi-Region'});

CREATE (alice)-[:HOLDS_ROLE {
  role: 'CTO',
  valid_from: datetime('2021-01-01T00:00:00Z'),
  valid_to: datetime('2023-06-30T23:59:59Z'),
  transaction_time: datetime('2021-01-01T00:05:00Z')
}]->(org);

CREATE (bob)-[:HOLDS_ROLE {
  role: 'CTO',
  valid_from: datetime('2023-07-01T00:00:00Z'),
  valid_to: null,
  transaction_time: datetime('2023-07-01T00:05:00Z')
}]->(org);

CREATE (alice)-[:APPROVED {
  valid_from: datetime('2022-05-10T00:00:00Z'),
  valid_to: null,
  transaction_time: datetime('2022-05-10T09:00:00Z')
}]->(chg22)-[:TARGETS {
  valid_from: datetime('2022-05-10T00:00:00Z'),
  valid_to: null,
  transaction_time: datetime('2022-05-10T09:00:00Z')
}]->(sys);

CREATE (bob)-[:APPROVED {
  valid_from: datetime('2024-02-01T00:00:00Z'),
  valid_to: null,
  transaction_time: datetime('2024-02-01T10:00:00Z')
}]->(chg24)-[:TARGETS {
  valid_from: datetime('2024-02-01T00:00:00Z'),
  valid_to: null,
  transaction_time: datetime('2024-02-01T10:00:00Z')
}]->(sys);