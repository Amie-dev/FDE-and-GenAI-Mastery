# Chapter Index

| Chapter | Title | Notes Link |
|---------|-------|------------|
| 01 | Why Text-Only AI Is Not Enough | [notes/01_Why_Text_Only_AI_Is_Not_Enough.md](./notes/01_Why_Text_Only_AI_Is_Not_Enough.md) |
| 02 | What Multimodal Models Understand & OCR vs MLLM | [notes/02_What_Multimodal_Models_Understand_And_OCR_vs_MLLM.md](./notes/02_What_Multimodal_Models_Understand_And_OCR_vs_MLLM.md) |
| 03 | The Text Pipeline Recap | [notes/03_The_Text_Pipeline_Recap.md](./notes/03_The_Text_Pipeline_Recap.md) |
| 04 | Images Are Numbers: Pixels, Patches, Visual Embeddings | [notes/04_Images_Are_Numbers_Pixels_Patches_And_Visual_Embeddings.md](./notes/04_Images_Are_Numbers_Pixels_Patches_And_Visual_Embeddings.md) |
| 05 | Connecting Vision to Language | [notes/05_Connecting_Vision_To_Language_Projection_Position_And_Attention.md](./notes/05_Connecting_Vision_To_Language_Projection_Position_And_Attention.md) |
| 06 | How Models Learn Vision-Language Alignment | [notes/06_How_Models_Learn_Vision_Language_Alignment.md](./notes/06_How_Models_Learn_Vision_Language_Alignment.md) |
| 07 | End-to-End Multimodal Pipeline & Application Boundary | [notes/07_The_End_To_End_Multimodal_Pipeline.md](./notes/07_The_End_To_End_Multimodal_Pipeline.md) |
| 08 | Production Multimodal Systems: Cost, Security, Evaluation | [notes/08_Production_Multimodal_Systems_Cost_Security_And_Evaluation.md](./notes/08_Production_Multimodal_Systems_Cost_Security_And_Evaluation.md) |
| 09 | Multimodal Data Ingestion & Advanced RAG | [notes/09_Multimodal_Data_Ingestion_And_Advanced_RAG.md](./notes/09_Multimodal_Data_Ingestion_And_Advanced_RAG.md) |
| 10 | Multimodal RAG & The Complete Picture | [notes/10_Multimodal_RAG_And_Complete_Picture.md](./notes/10_Multimodal_RAG_And_Complete_Picture.md) |

---

## Complete Combined Notes

- [Lecture_24_Complete_Notes.md](./notes/Lecture_24_Complete_Notes.md) — All 10 chapters combined into one reference document

---

## Code

### Basic Code (TypeScript / Express)

- **Entry:** [`code/Basic Code/src/index.ts`](./code/Basic Code/src/index.ts)
- **Config:** [`code/Basic Code/src/config/config.ts`](./code/Basic Code/src/config/config.ts)
- **Services:**
  - [`code/Basic Code/src/services/textPipeline.ts`](./code/Basic Code/src/services/textPipeline.ts) — Text → Tokens → IDs → Vectors
  - [`code/Basic Code/src/services/visionPipeline.ts`](./code/Basic Code/src/services/visionPipeline.ts) — Pixels → Patches → Embeddings
  - [`code/Basic Code/src/services/alignmentService.ts`](./code/Basic Code/src/services/alignmentService.ts) — Position, Projection, Cosine, Attention
  - [`code/Basic Code/src/services/costService.ts`](./code/Basic Code/src/services/costService.ts) — Image token budget & cost guard
  - [`code/Basic Code/src/services/chatService.ts`](./code/Basic Code/src/services/chatService.ts) — Multimodal call + history
- **Middleware:** [`code/Basic Code/src/middleware/upload.ts`](./code/Basic Code/src/middleware/upload.ts) — Untrusted image gate
- **Controllers:** [`code/Basic Code/src/controllers/chatController.ts`](./code/Basic Code/src/controllers/chatController.ts) — HTTP in/out
- **Routes:** [`code/Basic Code/src/routes/index.ts`](./code/Basic Code/src/routes/index.ts) — `/health`, `POST /chat`, `DELETE /chat`
- **Demo:** [`code/Basic Code/src/demo.ts`](./code/Basic Code/src/demo.ts) — Offline walkthrough (`npm run demo`)
- **Tests:** [`code/Basic Code/app.test.js`](./code/Basic Code/app.test.js) — Built-in test runner (`npm test`)
- **Implementation Guide:** [`code/Basic Code/implementations guide/`](./code/Basic Code/implementations guide/) — 10 chapters, full code + block-by-block explanation

### Production Code

- *Not implemented for this lecture*

---

## Assignment

- [Assignment/task.md](./Assignment/task.md) — Deliverables, acceptance criteria, stretch goals

---

## Source References

- **FDE L16**: `Forward-Deployed-Engineer/Lecture 16/notes/01...08`
- **GAC D04**: `gen-ai-cohort/week02/learning/day04/notes/05-multimodal-ingestion-and-advanced-rag.md`

---

## Checklist

- [x] Read every source note listed in the roadmap for Lecture 24
- [x] Write my own chapter notes in `notes/`
- [x] Build / rebuild the code in `code/`
- [x] Pass the lecture's completion gate