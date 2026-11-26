# Client Chapter 7 — Live Indexing Progress Polling & Status UI

## 1. Goal & Outcome
- **Goal**: Integrate real-time background status polling for knowledge sources transitioning from PENDING -> PROCESSING -> INDEXED / FAILED.
- **Student Outcome**: Live UI indicators reflecting vector indexing progress with automatic refetching and error tooltips.

---

## 2. Client Installation Commands

From directory `week05/chaibook-llm-sir/client`:

```bash
cd week05/chaibook-llm-sir/client
npm install @tanstack/react-query lucide-react
```

---

## 3. Client Source Code & Explanations
