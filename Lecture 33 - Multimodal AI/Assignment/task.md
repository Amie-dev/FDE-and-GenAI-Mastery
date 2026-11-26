# Lecture 24 — Multimodal AI: Assignment

> **Source:** `../roadmap.md` → "Lecture 24" → **Build** and **Gate**
> **Gate:** you can explain why OCR + a text LLM is sometimes *better* than a multimodal model.

---

## Task Statement

You have built a minimal multimodal ingestion + question-answering service. Now prove you can
**run it, price it, and defend it** — including the case where a cheaper, simpler stack wins.

---

## Deliverables

### 1. Run the offline pipeline end-to-end

```bash
cd "Lecture 24 - Multimodal AI/code/Basic Code"
npm install
npm run demo
```

- [ ] `npm run demo` prints all six sections (text pipeline → vision pipeline → alignment →
      training → request → cost) with no errors and no API key.

### 2. Run the HTTP server and exercise the contract

```bash
npm start
```

- [ ] `GET /health` returns `ok: true` with the configured model, patch size and budget.
- [ ] `POST /chat` with a text-only message returns a text reply (offline mode).
- [ ] `POST /chat` with an image (under budget) returns a text reply.
- [ ] `POST /chat` with an image **over budget** returns HTTP 413 with a clear message.
- [ ] `DELETE /chat` clears history.

### 3. Run the test suite

- [ ] `npm test` reports `pass N / fail 0`.

### 4. OCR vs MLLM decision

Write a short document (1–2 pages) answering:

- [ ] When is OCR + a text-only LLM **better** than sending the image to a multimodal model?
- [ ] Give at least three concrete production scenarios.
- [ ] Explain the cost, latency and reliability trade-offs in each.

### 5. Cost report

- [ ] Using the formulas in Chapter 08, produce a table: image size → patch count →
      estimated tokens → approximate cost per request for `gpt-4o-mini` vs `gpt-4o`.
- [ ] Add a column for "cost over 10 turns" (the conversation trap).

---

## Acceptance Criteria

The learner proves the work is done when:

1. `npm run demo` runs without errors and every section prints sensible output.
2. `npm test` passes with zero failures.
3. Every route in the `/chat` contract behaves as documented (text in → text out,
   over-budget → 413, clear → 200).
4. The OCR vs MLLM document names at least three real scenarios and a clear rule for
   choosing between the two stacks.
5. The cost table covers at least four image sizes and both models, and includes the
   multi-turn cost column.

---

## Stretch Goals

1. **Real model integration** — set `OPENAI_API_KEY` and confirm that the *same* request
   shape now returns a real multimodal answer. Verify the offline reply and the model
   reply differ only in content, never in request structure.

2. **Prompt-injection probe** — craft an image whose visible text says "ignore previous
   instructions". Confirm the system prompt in `config.js` causes the model to report it
   rather than obey it.

3. **History compaction demo** — simulate a 10-turn conversation with one image per turn and
   show that `compactHistory()` keeps only the newest two images and digests the rest,
   cutting the re-sent token count dramatically.

---

## Hints

- Start with `npm run demo` — it is the whole pipeline with no network and no credits.
- The cost formulas are in `src/services/costService.js`; the budget is in `.env`.
- For the OCR vs MLLM question, think about *structured* text (invoices, receipts, forms)
  vs *unstructured* scenes (photos, screenshots with diagrams).