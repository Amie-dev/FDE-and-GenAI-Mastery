# Chapter 02 — Isolation Layers: V8 Isolates, Containers, gVisor & MicroVMs

> **Lecture 38 · Chapter 02 of 07** · Level: 🔴 Expert · Phase 8 — Multimodality, Full-Stack Apps & Agent Scaling

---

## 02.1 The Four Isolation Tiers

| Tier | Technology | Isolation Mechanism | Boot Time | RAM Overhead | Safe for Untrusted Code? |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1. V8 Isolate** | Cloudflare Dynamic Workers | Separate V8 heap/context per execution; no OS/syscalls | **~2–5 ms** | **~3–10 MB** | Yes (JS/TS only, `globalOutbound: null`) |
| **2. Standard Container** | Docker (`runc`) | Linux namespaces + cgroups; **shared host kernel** | 500–2,000 ms | 50–256 MB | **No** for multi-tenant untrusted code |
| **3. User-Space Kernel** | **gVisor (`runsc`)** | Intercepts syscalls in user-space Go kernel | 500–1,500 ms | 50–150 MB | **Yes** (strong syscall boundary) |
| **4. Hardware MicroVM** | **Firecracker / Kata / Docker AI Sandboxes** | KVM hardware virtualization + dedicated guest kernel | **120–250 ms** (snapshot) | 50–128 MB | **Gold Standard** for arbitrary OS/bash/Python |

---

## 02.2 The Three Non-Negotiable Axes of Any Sandbox
1. **Filesystem Axis:** Ephemeral root or copy-on-write snapshot; never mount host `/`, `~/.ssh`, or `/var/run/docker.sock`.
2. **Network Axis:** Default-deny egress; block `169.254.169.254` (cloud metadata) and internal VPC CIDRs; route allowed API calls through a **host-side proxy**.
3. **Process & Resource Axis:** `runAsNonRoot`, drop all Linux capabilities (`drop: ["ALL"]`), strict CPU/RAM/disk/PID quotas, and wall-clock timeouts.

