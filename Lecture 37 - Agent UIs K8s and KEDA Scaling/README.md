# Lecture 37 - Agent UIs K8s and KEDA Scaling

> **Stage 3: Ship** · **Phase:** 8 · Multimodality, Full-Stack Apps & Agent Scaling · **Level:** 🔴 Expert
> **Source:** `FDE S22 & S23` · **Master Map:** [`roadmap-v1.md`](../roadmap-v1.md)

---

## 🎯 Learning Goal

Ship interactive agent-to-user interfaces (`AG-UI`, `MCP Apps`) backed by stateless API pods, durable queues, Kubernetes/KEDA autoscaling, and microVM sandbox isolation.

| Navigation | Links |
| :--- | :--- |
| **Prerequisites** | [Lecture 34](../Lecture%2034%20-%20Full-Stack%20AI%20Platform/) · [Lecture 35](../Lecture%2035%20-%20Async%20Indexing%20and%20RAG%20Chat/) |
| **Unlocks** | [Lecture 39](../Lecture%2039%20-%20Distributed%20Inference%20SGLang%20llm-d%20and%20Dynamo/) · [Lecture 42](../Lecture%2042%20-%20AI%20Observability%20OTel%20and%20FOCUS%20FinOps/) |

---

## 📚 Planned Chapter Syllabus (`notes/`)

Write one markdown file per chapter inside `notes/`, followed by `notes/Lecture_37_Complete_Notes.md`:

| # | Planned Chapter | Key Topics to Cover |
| :---: | :--- | :--- |
| **01** | **Agent-to-User Interaction (`AG-UI` Protocol)** | Event streams for step progress, tool status, human approvals, and exception recovery. |
| **02** | **MCP Apps: Interactive UI inside MCP Hosts** | Returning rich interactive HTML/React UI components from MCP tool invocations. |
| **03** | **Managed vs. Self-Hosted Agent Runtimes** | Comparing Cloudflare Agents/Modal/Inngest Cloud against self-managed Kubernetes. |
| **04** | **Stateless API Services vs. Durable Worker State** | Decoupling HTTP/SSE ingress from long-running queue-backed agent workers. |
| **05** | **Kubernetes Pods, Queues & KEDA Autoscaling** | Scaling GPU/CPU agent worker pods dynamically on queue depth (`ScaledObject`). |
| **06** | **Safe Code Execution & Sandbox Isolation** | Isolating untrusted LLM-generated code with gVisor, Firecracker microVMs, and cgroups. |
| **07** | **Resource Limits, OOM Protection & Crash Recovery** | Preventing noisy-neighbor failures and recovering orphaned worker jobs. |

---

## 🛠️ What You Will Build (`code/`)

A **Containerized `AG-UI` Service + Kubernetes/KEDA Deployment** (`code/`): Next.js/Express `AG-UI` stream client, queue-backed worker container, `keda-scaledobject.yaml`, and sandboxed code runner.

---

## 🏁 Release Gate (`Assignment/task.md`)

To mark **Lecture 37** complete, verify all of the following:

Simulated queue spike triggers KEDA scale-out manifest validation; sandboxed code runner blocks host network and filesystem access.

---

## ✅ Checklist

| Step | Status |
| :--- | :---: |
| Review syllabus & reference links below | ☐ |
| Write all chapter notes + `Lecture_37_Complete_Notes.md` in `notes/` | ☐ |
| Update `index.md` with links to every chapter | ☐ |
| Build & test the runnable implementation in `code/` | ☐ |
| Write & pass the completion gate in `Assignment/task.md` | ☐ |

---

## 📁 Layout

```text
Lecture 37 - Agent UIs K8s and KEDA Scaling/
├── README.md          # this blueprint — goal · syllabus · build · gate · references
├── index.md           # chapter index (fill after writing notes/)
├── notes/             # chapter notes + Lecture_37_Complete_Notes.md
├── code/              # runnable TypeScript / Python / Infra implementation
└── Assignment/
    └── task.md        # hands-on assignment & release gate checklist
```

---

## 🔗 References & Resources

- [AG-UI Protocol Specification](https://docs.ag-ui.com/)
- [KEDA Kubernetes Event-Driven Autoscaling](https://keda.sh/docs/)
- See [`../task.md`](../task.md) for the ready-to-run generation prompt for **Lecture 37**.
