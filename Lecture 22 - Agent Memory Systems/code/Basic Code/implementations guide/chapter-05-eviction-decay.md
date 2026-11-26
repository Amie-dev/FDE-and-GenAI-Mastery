# Chapter 05 — Memory Eviction & Decay

**Notes source:** `Lecture 19 - Agent Memory Systems/notes/05_Memory_Eviction_Contradiction_Resolution_and_Decay.md`

**Goal:** Implement memory maintenance — score memories by frequency + recency, and remove the low-value ones so the store does not grow forever.

---

## 1. Eviction lives inside `src/services/ltm.ts`

There is no separate file for Chapter 05: `memoryScore` and `findEvictionCandidates` were already written in `src/services/ltm.ts` (Chapter 03 file) because eviction needs the same data it scores.

### Code file details

| Field | Meaning |
|-------|---------|
| File | `src/services/ltm.ts` (functions `memoryScore`, `findEvictionCandidates`, `deleteMemory`) |
| Chapter | 05 |
| What it does | Scores each memory as `hits + max(0, 30 - ageDays)`. Memories below the threshold are eviction candidates; `deleteMemory` removes one by id. |

### Block-by-block explanation (from `src/services/ltm.ts`)

| Block | What it does |
|-------|--------------|
| `memoryScore(memory)` | `hitCount + recencyScore` where `recencyScore = max(0, 30 - ageDays)`. A memory untouched for 30+ days scores only its hits — exactly the Chapter 5 scoring formula. |
| `findEvictionCandidates(threshold)` | `memories.filter(m => memoryScore(m) < threshold)` — every memory below the threshold becomes a deletion candidate. |
| `deleteMemory(memoryId)` | Removes one memory from the store by id. |

### Example

| Memory | Hits | Last access | Age (days) | Score | Verdict (threshold 5) |
|--------|------|-------------|------------|-------|-----------------------|
| "Lives in Tokyo" | 20 | 2 days ago | 2 | 20 + 28 = 48 | Keep |
| "Likes tea" | 3 | 10 days ago | 10 | 3 + 20 = 23 | Keep |
| "Old preference" | 0 | 90 days ago | 90 | 0 + 0 = 0 | Evict |

### Command

```bash
# Eviction is triggered by dreaming (Chapter 06)
curl -X POST http://localhost:3000/api/dream -H 'Content-Type: application/json' -d '{"userId":"u1"}'
```
