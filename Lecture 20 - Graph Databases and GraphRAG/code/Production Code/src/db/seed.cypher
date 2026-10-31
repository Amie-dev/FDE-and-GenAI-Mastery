// seed.cypher — sample data (idempotent via MERGE)

// --- People & Companies ---
MERGE (a:User {id: "alice", name: "Alice"})
SET a.email = "alice@example.com";
MERGE (b:User {id: "bob", name: "Bob"})
SET b.email = "bob@example.com";
MERGE (acme:Entity {name: "Acme Corp", type: "Company"})
MERGE (a)-[:WORKS_AT]->(acme);
MERGE (sf:Entity {name: "San Francisco", type: "City"})
MERGE (acme)-[:LOCATED_IN]->(sf);

// --- Hotels & Likes ---
MERGE (p1:Hotel {id: "h1", name: "Grand Plaza", city: "Paris"});
MERGE (a)-[:LIKES]->(p1);
MERGE (p2:Hotel {id: "h2", name: "The Bullnose", city: "London"});
MERGE (b)-[:LIKES]->(p2);

// --- Temporal Preferences (theme changed on 2025-01-15) ---
MERGE (prefLight:Preference {key: "theme", value: "light", validFrom: datetime("2024-01-01"), validTo: datetime("2025-01-15")})
SET prefLight.userId = "alice";
MERGE (prefDark:Preference {key: "theme", value: "dark", validFrom: datetime("2025-01-15"), validTo: null})
SET prefDark.userId = "alice";
MERGE (a)-[:HAS_PREF]->(prefLight);
MERGE (a)-[:HAS_PREF]->(prefDark);

// --- Skills ---
MERGE (summ:Skill {name: "Summarise", version: "2.1"});
MERGE (a)-[:HAS_SKILL]->(summ);
MERGE (summ)-[:VERSION]->(summ);

// --- Sessions (working memory) ---
MERGE (sess:Session {id: "sess_demo", createdAt: datetime("2025-03-10T14:00:00Z")})
SET sess.userId = "alice";
MERGE (m1:Message {id: "msg_1", role: "user", content: "Hi, I need help planning a trip to Paris."})
SET m1.ts = datetime("2025-03-10T14:00:00Z");
MERGE (sess)-[:HAS_MESSAGE]->(m1);
MERGE (m2:Message {id: "msg_2", role: "assistant", content: "I can help with that. Which hotels do you prefer?"})
SET m2.ts = datetime("2025-03-10T14:01:00Z");
MERGE (sess)-[:HAS_MESSAGE]->(m2);

// --- Documents (with placeholder embeddings - replace with real embeddings in production) ---
// NOTE: In production, replace $emb_* with actual embedding arrays.
// For Basic Code: these will be provided as query parameters via the bootstrap script.
MERGE (doc1:Document {id: "d1", title: "Introduction to Cypher"})
SET doc1.embedding = $emb_d1,
    doc1.content = "Cypher is Neo4j's declarative query language for property graphs...";
MERGE (doc1)-[:MENTIONS]->(:Entity {name: "Alice"});
MERGE (doc1)-[:MENTIONS]->(:Entity {name: "Cypher"});
MERGE (doc1)-[:MENTIONS]->(:Entity {name: "Grand Plaza"});
MERGE (doc1)-[:BELONGS_TO]->(:Category {name: "Fundamentals"});
MERGE (doc1)-[:REFERENCES]->(:Topic {name: "Graph Basics"});
MERGE (doc1)-[:WRITTEN_BY]->(a);

MERGE (doc2:Document {id: "d2", title: "Advanced Graph Relationships"})
SET doc2.embedding = $emb_d2,
    doc2.content = "Relationships in Neo4j are directed, typed, and can carry properties...";
MERGE (doc2)-[:MENTIONS]->(:Entity {name: "Bob"});
MERGE (doc2)-[:MENTIONS]->(:Entity {name: "The Bullnose"});
MERGE (doc2)-[:MENTIONS]->(:Entity {name: "London"});
MERGE (doc2)-[:BELONGS_TO]->(:Category {name: "Advanced"});
MERGE (doc2)-[:REFERENCES]->(:Topic {name: "Relationships"});
MERGE (doc2)-[:WRITTEN_BY]->(b);

// --- Episodic Events ---
MERGE (visit:Event {id: "ev_001", type: "HOTEL_VISIT"})
SET visit.ts = datetime("2025-03-10T15:00:00Z"),
    visit.summary = "Alice visited Grand Plaza in Paris";
MERGE (a)-[:INVOLVED_IN]->(visit);
MERGE (p1)-[:INVOLVED_IN]->(visit);
