# Lecture 43 - Progressive Autonomy flagd and Safe Releases

> **Stage 3: Ship** · **Phase:** 10 · Quality, FinOps, Identity & Security · **Level:** 🟠 Advanced
> **Source:** `FDE S18` · **Master Map:** [`roadmap-v1.md`](../roadmap-v1.md)

---

## 🎯 Learning Goal

Ship model migrations, prompts, and agent autonomy safely using shadow mode, `OpenFeature` + `flagd`, evaluation-gated canaries, release manifests, and technical UAT.

| Navigation | Links |
| :--- | :--- |
| **Prerequisites** | [Lecture 40](../Lecture%2040%20-%20Evals%20and%20Testing/) · [Lecture 42](../Lecture%2042%20-%20AI%20Observability%20OTel%20and%20FOCUS%20FinOps/) |
| **Unlocks** | [Lecture 45](../Lecture%2045%20-%20Security%20and%20Guardrails/) |

---

## 📚 Planned Chapter Syllabus (`notes/`)

Write one markdown file per chapter inside `notes/`, followed by `notes/Lecture_43_Complete_Notes.md`:

| # | Planned Chapter | Key Topics to Cover |
| :---: | :--- | :--- |
| **01** | **The Progressive Autonomy Ladder** | Shadow execution -> Human-approved -> Scoped autonomous -> Full production. |
| **02** | **OpenFeature & `flagd` for AI Runtime Control** | Decoupling model, prompt, and skill selection from code deploys via feature flags. |
| **03** | **Shadow Mode & Dark Launches** | Running candidate models/agents on live traffic silently to compare quality and latency. |
| **04** | **Evaluation-Gated Canary Rollouts** | Shifting 1% -> 10% -> 50% -> 100% traffic only when live eval metrics hold. |
| **05** | **Versioning Prompts, Models & Skills + Release Manifests** | Immutable release bundles capturing exact model ID, prompt hash, and skill versions. |
| **06** | **Automated Rollback & Incident Recovery** | Circuit breakers that revert `flagd` flags automatically on quality or latency drops. |
| **07** | **Technical UAT & Customer Handover Sign-Off** | Running structured User Acceptance Testing scripts before production handover. |

---

## 🛠️ What You Will Build (`code/`)

A **Shadow Mode + `OpenFeature`/`flagd` Canary Pipeline** (`code/`): routes live requests using `flagd` rules, runs shadow comparisons, and auto-reverts when simulated canary quality drops.

---

## 🏁 Release Gate (`Assignment/task.md`)

To mark **Lecture 43** complete, verify all of the following:

Injecting a degraded canary model triggers automatic `flagd` rollback to the baseline model within 30 seconds and emits a signed release manifest.

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Review syllabus & reference links below | ✅ |
| Write all chapter notes + `Lecture_43_Complete_Notes.md` in `notes/` | ✅ |
| Update `index.md` with links to every chapter | ✅ |
| Build & test the runnable implementation in `code/` | ✅ |
| Write & pass the completion gate in `Assignment/task.md` | ✅ |

---

## 📁 Layout

```text
Lecture 43 - Progressive Autonomy flagd and Safe Releases/
├── README.md          # this blueprint — goal · syllabus · build · gate · references
├── index.md           # chapter index (fill after writing notes/)
├── notes/             # chapter notes + Lecture_43_Complete_Notes.md
├── code/              # runnable TypeScript / Python / Infra implementation
└── Assignment/
    └── task.md        # hands-on assignment & release gate checklist
```

---

## 🔗 References & Resources

- [OpenFeature Specification](https://openfeature.dev/)
- [flagd Feature Flag Daemon](https://flagd.dev/)
- See [`../task.md`](../task.md) for the ready-to-run generation prompt for **Lecture 43**.
