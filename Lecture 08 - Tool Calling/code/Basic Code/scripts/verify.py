#!/usr/bin/env python3
"""
Offline verification walkthrough for the Lecture 08 Basic Code lab.

Twelve sections, no third-party dependencies, no API key required. Start the
server first (`npm run dev`), then:

    python3 scripts/verify.py

Every section asserts nothing — it prints what the engine actually returned, so
the output can be read as evidence rather than as a pass/fail. Exit code is 0
when every request completed.
"""
import json
import urllib.request
import urllib.error

B = "http://localhost:8098/api"


def call(method, path, body=None, tenant=None):
    """One API call. Returns (status, parsed_body) — including for 4xx."""
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(B + path, data=data, method=method)
    if data:
        req.add_header("content-type", "application/json")
    if tenant:
        req.add_header("x-tenant-id", tenant)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


def run(goal, **opts):
    """Chapter 05 §05.6 — the whole loop, as one helper."""
    _, d = call("POST", "/agent/run", {"goal": goal, **opts})
    return d


def banner(title):
    print()
    print("=" * 70)
    print(title)
    print("=" * 70)


banner("1. HEALTH — the wiring, tiers and brakes")
_, h = call("GET", "/health")
print("mode          :", h["mode"])
print("model         :", h["provider"], "/", h["model"], "| tool_choice:", h["toolChoice"])
print("brakes        :", h["brakes"])
print("toolPolicy    :", h["toolPolicy"])
print("tools         :", ", ".join(f"{t['name']}[{t['tier']}]" for t in h["registry"]))
print("endpoints     :", len(h["endpoints"]))

banner("2. THE 3-HOP CHAIN — the lecture's gate")
d = run("Convert $120 into Indian rupees and then divide that amount equally among 6 people.")
print("ANSWER:", d["answer"])
print("STEPS :", d["steps"], "| HALTED:", d["halted"], "| pendingApproval:", d["pendingApproval"])
for s in d["trace"]:
    for c in s["calls"]:
        print(f"  step {s['step']}: {c['name']}({c['rawArguments']}) -> {c['outcome']} "
              f"code={c.get('code')} cached={c['cached']}")
lg = d["ledger"]
print("LEDGER: input per step", [m["inputTokens"] for m in lg["modelCalls"]],
      "| out per step", [m["outputTokens"] for m in lg["modelCalls"]])
print("        totalInput", lg["totalInputTokens"], "| totalOutput", lg["totalOutputTokens"],
      "| steps", lg["steps"], "| halted", lg["halted"])

banner("3. PARALLEL BATCH — two calls in ONE assistant message")
d = run("What is the weather in London and how much is $500 in Indian rupees?")
print("STEPS:", d["steps"])
for s in d["trace"]:
    print(f"  step {s['step']}: {len(s['calls'])} call(s) in one assistant message")
    for c in s["calls"]:
        print(f"     {c['name']} {c['rawArguments']} -> {c['outcome']}")

banner("4. NEGATIVE — no tool proposed, no over-calling")
d = run("Hello! How are you today?")
print("STEPS:", d["steps"], "| total tool calls:",
      sum(len(s["calls"]) for s in d["trace"]), "| halted:", d["halted"])
print("ANSWER:", d["answer"])

banner("5. SELF-HEALING — a domain error becomes an observation")
d = run("What is 50 divided by 0?")
for s in d["trace"]:
    for c in s["calls"]:
        print(f"  step {s['step']}: {c['name']}({c['rawArguments']}) -> {c['outcome']} code={c.get('code')}")
print("STEPS:", d["steps"], "| HALTED:", d["halted"])
print("ANSWER:", d["answer"])

banner("6. ERROR CLASSES — every one is a 200 with a result")
for label, tool, args, tenant in [
    ("MALFORMED_ARGUMENTS", "calculate", '{"operation": "add"', "tenant-a"),
    ("INVALID_ARGUMENTS", "calculate", '{"operation":"frobnicate"}', "tenant-a"),
    ("UNKNOWN_TOOL", "teleport", "{}", "tenant-a"),
    ("NOT_FOUND cross-tenant", "getInvoiceStatus", '{"invoiceId":"INV-1024"}', "tenant-b"),
]:
    status, r = call("POST", f"/tools/{tool}/call", {"arguments": args}, tenant=tenant)
    print(f"HTTP {status}  {label}")
    print(f"   tool={r['tool']} outcome={r['outcome']} code={r.get('code')}")
    print(f"   content={r['content'][:160]}")

banner("7. TTL CACHE — the same read twice")
for i in (1, 2):
    _, r = call("POST", "/tools/getCurrentWeather/call", {"arguments": '{"city":"Delhi"}'})
    print(f"  call {i}: cached={r['cached']} latencyMs={r['latencyMs']} content={r['content'][:95]}")

banner("8. THE TIER 3 GATE — approval, replay, cross-tenant")
d = run("Please refund INV-1025, amount 1299.")
print("run  : steps", d["steps"], "| halted", d["halted"], "| pendingApproval", d["pendingApproval"])
for s in d["trace"]:
    for c in s["calls"]:
        print(f"   {c['name']}({c['rawArguments']}) -> {c['outcome']} code={c.get('code')}")
print("ANSWER:", d["answer"])
_, q = call("GET", "/approvals")
for a in q["pending"]:
    print(f"queue: {a['approvalId']} {a['toolName']}[{a['tier']}] {a['status']} "
          f"tenant={a['tenantId']} by={a['requestedBy']}")
    print(f"       args={a['rawArguments']} hash={a['argsHash']}")
    print(f"       summary={a['summary']}")
aid = q["pending"][0]["approvalId"]
s1, r1 = call("POST", f"/approvals/{aid}", {"decision": "approve"}, tenant="tenant-a")
print(f"approve #1 -> HTTP {s1} execution={json.dumps(r1['execution'])}")
s2, r2 = call("POST", f"/approvals/{aid}", {"decision": "approve"}, tenant="tenant-a")
print(f"approve #2 -> HTTP {s2} execution={json.dumps(r2['execution'])}")
s3, r3 = call("POST", f"/approvals/{aid}", {"decision": "approve"}, tenant="tenant-b")
print(f"tenant-b   -> HTTP {s3} {json.dumps(r3)}")
s4, r4 = call("POST", "/approvals/apr_does_not_exist", {"decision": "approve"})
print(f"unknown id -> HTTP {s4} {json.dumps(r4)}")

banner("9. ROUTING EVAL — four metrics and the confusion matrix")
_, e = call("POST", "/eval/routing")
print("fixtures          :", e["fixtures"])
print("selectionAccuracy :", e["selectionAccuracy"])
print("argumentValidity  :", e["argumentValidity"])
print("avgHops           :", e["avgHops"])
print("terminationRate   :", e["terminationRate"])
print("confusion matrix  :")
for k, v in e["confusionMatrix"].items():
    print(f"   {k:20s} -> {v}")
for row in e["rows"]:
    print(f"   {row['id']:3s} exp={row['expected']:20s} obs={row['observed']:20s} "
          f"sel={row['selectionOk']} args={row['argsOk']} hops={row['hops']} halted={row['halted']}")

banner("10. LEDGER — cost, halt reasons, p50/p95")
_, l = call("GET", "/ledger")
for k in ("runs", "avgSteps", "avgInputTokens", "p50Tokens", "p95Tokens", "toolTimeMsTotal", "haltReasons"):
    print(f"  {k:16s}: {l[k]}")

banner("11. BRAKES — maxSteps and tool_choice")
d = run("Convert $120 into Indian rupees and then divide that amount equally among 6 people.", maxSteps=2)
print("maxSteps=2 -> steps", d["steps"], "| halted", d["halted"])
print("ANSWER:", d["answer"][:170])
d = run("What is the weather in Delhi right now?", toolChoice="none")
print("tool_choice=none -> steps", d["steps"], "| tool calls",
      sum(len(s["calls"]) for s in d["trace"]), "| halted", d["halted"])
d = run("What is 8745 multiplied by 493?", toolChoice="calculate")
print("tool_choice=calculate -> first tool",
      d["trace"][0]["calls"][0]["name"] if d["trace"] and d["trace"][0]["calls"] else None)

banner("12. VALIDATION — the 400 path")
for body in ({"goal": ""}, {"goal": "hi", "maxSteps": 9999},
             {"goal": "hi", "toolChoice": "Not A Tool"}, {"goal": "hi", "timeoutMs": 999999}):
    s, r = call("POST", "/agent/run", body)
    print(f"  HTTP {s} body={json.dumps(body)[:58]:60s} -> {json.dumps(r)[:120]}")

