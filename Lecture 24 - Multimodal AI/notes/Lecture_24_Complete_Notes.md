# Lecture 24 — Multimodal AI: Complete Notes (Combined)

> **Lecture 24** covers the fundamentals of multimodal AI — how LLMs understand images. This file combines all 10 chapter notes into one reference.

---

## Chapter 01: Why Text-Only AI Is Not Enough

> The baseline contract is `String → LLM → String`. It works when everything is text. Real evidence often arrives as screenshots, invoices, receipts, dashboards, product photos — not as text.

### Key ideas:
- **The break:** Real evidence arrives as images. The contract breaks because the information the user cares about is *inside* an image, not in the text.
- **Failure modes:** Silent drop, filename-only, confident hallucination.
- **The root cause:** A **missing modality is a missing input**, not a missing instruction.
- **Modality:** A form in which information exists (text, image, audio, video).
- **Multimodal:** One model, many modalities (text + image).
- **Multi-model:** Many models behind a router; **orthogonal** to multimodal.
- **Output:** Still text — which is why your application barely changes.

> **Final mental model:** the question is never *"can the model see?"* It is *"did the evidence ever reach the model as a modality it accepts?"*

---

## Chapter 02: What Multimodal Models Understand & OCR vs MLLM

> A multimodal model does **more than simply read text from an image.** It may understand objects, text, layout, position, relationships, context, and meaning.

### Key ideas:
- **The invoice example:** Image + instruction → typed object.
- **What it understands:** Objects, text, layout, position, relationships, context, meaning.
- **Extraction vs understanding:** Same words, different value. One is text, the other is an answer.
- **OCR:** `Image → Text`; deterministic, cheap, layout-blind, semantics-free. The board's point: OCR is a **format converter** (`error.png` → `error.txt`), nothing more.
- **Multimodal LLM:** `Image + Question → Understanding → Answer`; probabilistic, costly, comprehension-capable.
- **The intuition:** OCR reads the page; a multimodal LLM tells you **what matters on it**.
- **The production pattern:** OCR for **characters**, MLLM for **comprehension**, both when you need auditable comprehension.
- **The risk:** Plausible-but-absent values — validate, ground, and allow "unknown".

> **Final mental model:** OCR answers *"what characters are here?"*. A multimodal model answers *"what does this mean, and what should I do?"*.

---

## Chapter 03: The Text Pipeline Recap

> Before we can explain how an image becomes something a model understands, we must state precisely how **text** becomes something a model understands. That pipeline — tokenize, look up an embedding, produce vectors — is the pattern the image pipeline will copy at every step.

### Key ideas:
- **The model only computes on numbers.** Words cannot be added, scaled or compared by dot product; vectors can.
- **The text pipeline:** Sentence → tokens → token IDs → embeddings → vectors.
- **The board's example:** `"HI, my name is Aditya"` → tokens → IDs `23 41 56` → vectors `v1 v2 v3`.
- **Token IDs:** Arbitrary table indices; no semantic meaning.
- **Embeddings:** Learned vectors; the substrate of all downstream math.
- **Why numbers:** Attention and matrix operations are defined on vectors, not words.
- **Position + attention:** Needed for order and context — and images will need their own versions.
- **The bridge:** Text and images converge on the *same* representation: sequences of learned vectors.

> **Final mental model:** the model is a **vector machine**. Text is one way to feed it vectors; an image is another.

---

## Chapter 04: Images Are Numbers: Pixels, Patches and Visual Embeddings

> An image is a grid of numbers. The problem is not *whether* it is numerical — it is *what shape* those numbers are in.

### Key ideas:
- **Images are already numbers:** 1920×1080 ≈ 2.07M pixels ≈ 6.2M numbers (R,G,B per pixel).
- **Why raw pixels fail:** Too many, no units, no abstraction, no locality, redundancy.
- **Step 1 — Patches:** Cut the grid into regions (e.g. 16×16); a grid becomes a **sequence**.
- **The analogy:** Sentence → tokens, Image → patches; same architectural role.
- **The nuance:** Tokens are symbols; patches are regions — analogous, not identical.
- **Step 2 — Vision encoder:** Another neural network; patches → **visual embeddings**.
- **The output:** A dense vector like `[0.12, -0.55, 1.04, 0.31, …]`.
- **Convergence:** Text embeddings and visual embeddings are the **same kind of object**: vectors.
- **The board's label:** Two paths, one word: **vectors**.

> **Final mental model:** an image is a grid of numbers; the model reshapes it into a **sequence of patches**, then compresses each patch into a **learned vector**. Once it is a sequence of vectors, it is indistinguishable in *type* from text.

---

## Chapter 05: Connecting Vision to Language

> Visual embeddings may **not be directly compatible** with the representation expected by the language model. The projection layer translates vision vectors into language vectors.

### Key ideas:
- **The gap:** Visual embeddings may not match the LLM's vector space.
- **Step 3 — Projection layer / adapter:** Translates vision vectors into language vectors. Variants: linear projection, MLP projection, resampler (which also *reduces* token count).
- **Position:** Layout matters: `button below text box` ≠ `button above text box`. The board: **patch content + patch position**, from `top-left` to `bottom-right`.
- **Object recognition:** `ear + eye + fur + whiskers → cat`; background must be suppressed.
- **The analogy:** `bank` disambiguated by context = a patch disambiguated by neighbours.
- **Attention:** The same mechanism, applied to patches: which regions are related?
- **Fusion:** One sequence, four attention flows: text→text, text→image, image→text, image→image.
- **OCR-free reading:** The model recognises letters, words, layout and UI elements, then *reasons*.
- **The payoff:** We do not necessarily need a separate OCR system in front of the model.

> **Final mental model:** the projection makes vision *speak the same language* as text; position makes the picture *make sense*; attention makes the regions *relate*. Remove any one of the three and multimodal understanding collapses.

---

## Chapter 06: How Models Learn Vision-Language Alignment

> How does the model learn that a cat is a cat? The answer: training on **large amounts of visual + language information**.

### Key ideas:
- **The question:** How does the model learn that a cat is a cat?
- **The answer:** Training on **large amounts of visual + language information**.
- **Training data:** Image–caption pairs, VQA, interleaved documents.
- **The relationship learned:** `visual patterns ↕ language concepts`.
- **The board:** `Text → Language concepts` and `Image → Visual patterns`, plus *images + description*.
- **The mechanism:** Alignment: pull matching pairs together, push mismatches apart.
- **The result:** A **shared vector space** holding both modalities.
- **The stages:** Alignment → instruction tuning → preference tuning.
- **The constraint:** Data quality and breadth cap what the model can see.
- **The honesty:** Knowing is statistical; a confident caption can still be wrong.

> **Final mental model:** nobody wrote the rule "a cat has whiskers". The model was shown millions of pictures next to the word *cat* until the two landed in the same neighbourhood of vector space. **Alignment is that neighbourhood.**

---

## Chapter 07: End-to-End Multimodal Pipeline & Application Boundary

> An LLM does not really work with English words or JPEG files. It works with numerical representations.

### Key ideas:
- **End-to-end flow:** Text → tokens → embeddings; Image → patches → encoder → embeddings; converge at the model.
- **The core idea:** The model works with **numerical representations**, not words or JPEGs.
- **Preprocessing:** Resize, crop, tile, normalize — to make the token count manageable.
- **The board:** `Raw Image → compress → compressed image → LLM`.
- **Tiling:** Large images are split so small details survive.
- **Quality matters:** Small text, blur, low contrast, cropping all degrade reliability.
- **The application boundary:** The app **packages** text + image; it does not understand the image.
- **The board's contract:** `Client —/chat→ LLM`, "Text / Image → Text".
- **Conversation history:** Images persist in context — and are **re-sent** every turn.
- **Cost driver:** Image tokens × turns; compaction is essential.
- **The mental model:** The seven-step ladder from text/image to output tokens.

> **Final mental model:** your application's job is unchanged — accept input, build a request, validate the answer. What changed is that one of the input *parts* is now a picture.

---

## Chapter 08: Production Multimodal Systems: Cost, Security, Evaluation

> A multimodal app does not fundamentally change how an AI app works.

### Key ideas:
- **Cost:** Image tokens scale with **area**; history re-sends them every turn.
- **The levers:** Crop, downscale, compact history, cap counts, cheaper models, caching.
- **Latency:** Vision encode + prefill happen before the first token.
- **The new threat:** **Visual prompt injection** — instructions hidden inside the image.
- **The defence stack:** Untrusted-data framing, no secrets, least privilege, egress control, human confirmation, detection.
- **Privacy:** Screenshots are PII; redact, bound retention, log hashes not pixels.
- **Evaluation:** A golden set from *your* images, task-specific metrics, provider comparison on your data.
- **The runbook:** Six prints: the image, the order, the token count, the output, the parse, the next-turn context.
- **The rule:** Vision is a powerful, expensive, untrusted input — budget it, gate it, and measure it.

> **Final mental model:** the lecture opened by saying text-only AI is not enough. It closes by saying the fix is not a bigger model — it is a **pipeline**, and every stage of that pipeline (resolution, tokens, order, history, trust) is a decision *you* make.

---

## Chapter 09: Multimodal Data Ingestion & Advanced RAG

> Data ingestion is the process of taking raw data from different sources and converting it into a format that your AI system can process, search, and retrieve.

### Key ideas:
- **Universal RAG ingestion principle:** Convert heterogeneous sources into a **semantic representation**, often text, before generating embeddings.
- **Multi-modal data sources:** PDF, DOCX, Audio, Video, Image, Website, Database — each requires different extraction.
- **PDF ingestion:** Normal PDF vs scanned PDF (requires OCR).
- **Audio ingestion:** Audio → Speech-to-Text → Transcript → Chunking → Embedding.
- **Video ingestion:** Contains audio + frames; both need separate processing.
- **Image ingestion:** Approach 1 — OCR. Approach 2 — Vision model description. Approach 3 — Multimodal embeddings.
- **Web ingestion:** HTML parser → Remove Navigation/Ads/Scripts → Clean Text → Chunks → Embeddings.
- **Unified multi-modal architecture:** Data sources → Normalization → Chunking → Embeddings → Vector Store.
- **Metadata: The hidden superpower:** Rich metadata enables filtering (e.g., search only HR documents).
- **Where naive RAG fails:** Query ambiguity, chunk boundary problems, lost global context, exact keyword failure, Top-K ≠ Best-K.
- **Advanced RAG:** Query understanding → Query rewriting → Hybrid retrieval → Reranking → Context construction → LLM → Grounded answer.
- **Query rewriting:** Generate multiple better queries from the user's original question.
- **HyDE:** Hypothetical Document Embeddings. Generate a hypothetical answer → embed → search. Does **not** mean the hypothetical answer is trusted.
- **Hybrid search:** Dense Search + Sparse/Keyword Search.
- **Re-ranking:** Retrieval might return 20 chunks, but reranker returns top 5 for the LLM.
- **Production RAG pipeline:** Ingestion → Normalization → Chunking → Embeddings → Vector Store → Query → Query Rewrite → Hybrid Retrieval → Reranker → Context Build → LLM → Grounded Answer.
- **Key takeaways:** Multi-modal ingestion, naive vs advanced RAG, most important concept: RAG quality depends heavily on retrieval quality.

> **Remember:** An LLM is the **reasoning and generation engine**. Your retrieval system is responsible for finding the **right information**.

---

## Chapter 10: Multimodal RAG & The Complete Picture

> Let's tie together everything from all 10 chapters.

### Key ideas:
- **Text-RAG over image-derived text:** OCR a screenshot → get text → embed → search → answer. Cheap and proven, but loses visual layout.
- **True multimodal retrieval:** Embed images and text into a shared embedding space. Can retrieve images directly by visual content. Requires larger models trained on multimodal data.
- **Hybrid pattern:** Combine both OCR + text RAG and multimodal embeddings. For example, in a product catalog: document the image with OCR, also embed the image via CLIP-style model.
- **When to use which approach:**
  - Invoice number extraction → OCR + text RAG
  - Product recommendation from screenshot → Multimodal RAG
  - Document classification → Text RAG (use OCR output)
  - Diagram explanation → Multimodal RAG
  - Multipage PDF → OCR + text RAG
  - Security camera footage → Multimodal RAG
- **Schema contracts for multimodal RAG:** Ground outputs with evidence (bbox, page). Example: GroundedInvoice schema.
- **The complete pipeline:** Phase 1: Preparing inputs → Phase 2: Projection & alignment → Phase 3: Storage → Phase 4: Retrieval → Phase 5: Generation.
- **Multimodal vs multi-model:** Different inputs vs different models; can be combined.
- **Production considerations:** Cost, latency, security, privacy, evaluation (from Chapter 08).
- **Final mental model:** Multimodal AI is not a magical capability. It is a **pipeline** — and every stage of that pipeline (resolution, tokens, order, history, trust) is a decision *you* make. The model learns to connect images and text through alignment training. Your job is to build the plumbing around it and ensure it works safely at scale.

> **Final mental model:** Multimodal AI is not a magical capability. It is a **pipeline** — and every stage of that pipeline (resolution, tokens, order, history, trust) is a decision *you* make. The model learns to connect images and text through alignment training. Your job is to build the plumbing around it and ensure it works safely at scale.

---

## Quick Reference: The Complete Pipeline

```
User Query (text or image)
    ↓
1. Encode: Text → tokens → embeddings; Image → patches → encoder → visual embeddings
    ↓
2. Project & align: Both in shared vector space (via contrastive training)
    ↓
3. Store: In vector DB with rich metadata (source, page, timestamps, etc.)
    ↓
4. Query: Embed the user query; search (dense + sparse/hybrid); rerank
    ↓
5. Context: Build grounded context from top results
    ↓
6. Generate: Multimodal LLM produces text answer + citations/grounding
    ↓
7. Validate: Check PII, validate against schema, guard against injection
```

---

## Lecture 24 Go-Live Checklist

### Cost
- [ ] Image token count measured for a typical image
- [ ] `tokens × turns × users × days` budget calculated
- [ ] Crop/downscale policy implemented before send
- [ ] History compaction implemented (old images → text digests)
- [ ] Per-request image count and size caps enforced

### Latency
- [ ] p50 / p95 measured for typical image + typical answer
- [ ] "Reading your image..." UI state present (no blank wait)
- [ ] Streaming wired end to end

### Security
- [ ] Images treated as untrusted input in the system prompt
- [ ] No secrets in the context
- [ ] Tool allow-list + least privilege
- [ ] Human confirmation for destructive actions
- [ ] Egress control for outbound calls
- [ ] SSRF-safe image transport (own storage / signed URLs; never user URLs)
- [ ] Injection test included in the golden set

### Privacy & compliance
- [ ] PII redaction / masking before send
- [ ] Retention and training-use settings confirmed with provider
- [ ] Logs store id + hash + dimensions — never raw pixels
- [ ] Data residency requirement satisfied
- [ ] Deletion path covers derived artefacts

### Quality
- [ ] Golden set built from your images (50–200, incl. edge cases)
- [ ] Task-appropriate metrics defined and baselined
- [ ] "Not present" escape value honoured by the model
- [ ] Structured output + validation (Lecture 13) where extracting
- [ ] Provider comparison done on the golden set (quality, cost, latency)

### Operations
- [ ] Six-step failure runbook documented
- [ ] Trace includes: image id, dimensions, token count, prompt order, raw output
- [ ] Alert on cost-per-conversation and on image-token outliers