# 📘 Chapter 4 — Distribution, Sharing & API Integration

## 1. Chapter Overview

Building a Skill is only half of the problem.

A useful Skill also needs a reliable way to be:

- packaged
- versioned
- shared
- installed
- discovered
- integrated with tools
- used by agents programmatically
- maintained across different environments

The complete lifecycle:

```mermaid
flowchart LR
    A["Build Skill"] --> B["Package"]
    B --> C["Version"]
    C --> D["Distribute"]

    D --> E["Claude.ai"]
    D --> F["Claude Code"]
    D --> G["GitHub / Repository"]
    D --> H["API / Agent Platform"]

    E --> I["Use Skill"]
    F --> I
    G --> I
    H --> I

    I --> J["Monitor"]
    J --> K["Update"]
    K --> C
```

The key idea:

> **A Skill is a portable capability package that can be distributed wherever a compatible agent runtime supports the Agent Skills format.**

The Agent Skills format uses a directory containing a required `SKILL.md` file plus optional scripts, references, and assets.

---

## 2. Skill Distribution Models

There are several ways to distribute Skills depending on the environment.

```mermaid
flowchart TD
    S["Agent Skill"]

    S --> A["Personal / User Installation"]
    S --> B["Project / Repository"]
    S --> C["Plugin / Marketplace"]
    S --> D["Claude.ai"]
    S --> E["Programmatic API"]

    A --> A1["Local Skill Directory"]
    B --> B1[".claude/skills/"]
    C --> C1["Installable Skill Bundle"]
    D --> D1["Uploaded / Available Skills"]
    E --> E1["Skills API / Agent Configuration"]

    style S fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
```

The exact installation mechanism is **platform-specific**. The common element is the Skill package itself: `SKILL.md` plus any supporting resources.

---

## 3. User-Level Distribution

A Skill can be distributed directly to an individual developer or user.

### Typical package structure:

```text
payment-gateway-builder/
├── SKILL.md
├── scripts/
│   ├── validate.js
│   └── configure.js
├── references/
│   └── payment-api.md
└── assets/
    └── config-template.json
```

The user can then install or upload the package using whatever mechanism their agent platform provides.

### Typical workflow:

```mermaid
sequenceDiagram
    participant D as Developer
    participant S as Skill Package
    participant A as Agent

    D->>S: Create Skill folder
    D->>S: Add SKILL.md
    D->>S: Add scripts/references/assets

    D->>A: Install / upload Skill

    A->>S: Discover metadata
    A->>S: Load SKILL.md when relevant
    A->>S: Load supporting resources when needed

    A-->>D: Execute workflow
```

### Important concept:

The Skill package should be **self-contained**.

Avoid requiring users to manually copy random pieces of the Skill into prompts.

Instead:

```text
Skill Package
     │
     ├── Instructions
     ├── Workflow
     ├── Scripts
     ├── References
     └── Assets
```

This makes the capability easier to reproduce and maintain.

---

## 4. Claude Code / Repository Distribution

For development workflows, Skills can live inside a project repository.

### Common structure:

```text
my-project/
├── .claude/
│   └── skills/
│       ├── code-review/
│       │   └── SKILL.md
│       │
│       ├── database-migration/
│       │   └── SKILL.md
│       │
│       └── api-testing/
│           ├── SKILL.md
│           └── scripts/
│               └── test_api.js
│
├── src/
├── package.json
└── README.md
```

This creates an important development pattern:

> **The repository can contain both the application and the instructions that tell an agent how to work on that application.**

Repository-based Skills under `.claude/skills`, where each Skill is discovered from its own directory containing `SKILL.md`.

---

## 5. Team & Organization Distribution

Organizations may want to distribute common Skills across developers or agents.

Examples:

- company coding standards
- security review
- database migration
- documentation generation
- API integration
- incident response
- release management

### Architecture:

```mermaid
flowchart TD
    ORG["Organization"]

    ORG --> S1["Security Skill"]
    ORG --> S2["Code Review Skill"]
    ORG --> S3["Release Skill"]
    ORG --> S4["Documentation Skill"]

    S1 --> T1["Developer A"]
    S1 --> T2["Developer B"]
    S1 --> T3["CI Agent"]

    S2 --> T1
    S2 --> T2

    S3 --> T3
    S4 --> T1

    style ORG fill:#e1f5fe,stroke:#01579b,stroke-width:2px
```

### The important distinction:

#### Centralized distribution

The organization controls the Skill.

```text
Organization
     ↓
Central Skill Repository
     ↓
Developers / Agents
```

#### Repository-local distribution

The project itself owns the Skill.

```text
Git Repository
     ↓
.claude/skills/
     ↓
Agents working on repository
```

For team workflows, repository-based Skills have a major advantage: **the Skill can be version-controlled alongside the codebase.**

### Distribution decision matrix:

| Use Case | Recommended Model | Why |
|---|---|---|
| Personal project | Local / Repository | Simple setup, no infrastructure needed |
| Team collaboration | Repository-based | Version control alongside codebase |
| Organization-wide | Centralized / Marketplace | Governance, consistent standards |
| Public sharing | Marketplace / GitHub | Discoverability, community |
| SaaS application | Skills API / Agent Platform | Programmatic access, embedded agents |

---

## 6. Agent Skills Open Standard

One of the most important developments is that Agent Skills are not limited to a single proprietary format.

The Agent Skills format was originally developed by Anthropic and released as an open standard. It is now documented independently through the Agent Skills specification.

### Core structure:

```text
my-skill/
├── SKILL.md
├── scripts/
├── references/
└── assets/
```

The minimum important metadata is:

```yaml
---
name: my-skill
description: Explains what the skill does and when an agent should use it.
---
```

The standard describes:

- `SKILL.md` as the entry point
- `name` and `description` metadata
- Markdown instructions
- optional scripts
- optional references
- optional assets

### Skill manifest example:

```ts
interface SkillManifest {
  name: string
  description: string
  version?: string
  entryPoint: string
  scripts?: string[]
  references?: string[]
  assets?: string[]
  dependencies?: {
    mcpServers?: string[]
    environment?: string[]
    tools?: string[]
  }
}

const paySkillManifest: SkillManifest = {
  name: 'pay-skill',
  description: 'Configures payment gateway integrations with validation and compliance rules.',
  version: '1.0.0',
  entryPoint: 'SKILL.md',
  scripts: ['scripts/validate_payment.js'],
  references: ['references/compliance-rules.md'],
  assets: ['assets/invoice-template.md'],
  dependencies: {
    mcpServers: ['stripe-mcp', 'payflow-mcp'],
    environment: ['STRIPE_API_KEY', 'PAYFLOW_API_KEY']
  }
}
```

---

## 7. Portability

The biggest benefit of an open Skill format is portability.

Instead of creating:

```text
Claude-specific instructions
        +
Cursor-specific instructions
        +
Copilot-specific instructions
        +
Other-agent-specific instructions
```

you can create a common Skill:

```mermaid
flowchart TB
    S["Agent Skills Format"]
    S --> A["Agent A"]
    S --> B["Agent B"]
    S --> C["Agent C"]
    S --> D["Agent D"]
```

### However:

> **The format can be portable while the implementation requirements may not be.**

A Skill can depend on:

- local shell commands
- Python
- Node.js
- filesystem behavior
- specific MCP servers
- specific APIs
- authentication
- proprietary tools

Therefore, portability of the **format** does not guarantee identical portability of the **behavior**.

---

## 8. Skill Portability Layers

Think about portability in three layers.

```mermaid
flowchart TB
    A["Skill Package"]

    A --> B["Portable Layer"]
    A --> C["Environment Layer"]

    B --> B1["SKILL.md"]
    B --> B2["Workflow Instructions"]
    B --> B3["References"]
    B --> B4["General Assets"]

    C --> C1["Python / Node"]
    C --> C2["Filesystem"]
    C --> C3["MCP Servers"]
    C --> C4["APIs"]
    C --> C5["Credentials"]
    C --> C6["OS / Shell"]

    C --> D["Platform Compatibility Check"]
```

### Example:

A generic code-review Skill (`SKILL.md`) can be portable.

But this (`scripts/run-security-scan.sh`) might require:

```text
Linux
+
Bash
+
security-scanner
```

Therefore the Skill should clearly document those dependencies.

### Portability documentation example:

```ts
interface PortabilityReport {
  skillName: string
  formatPortable: boolean
  runtimePortable: boolean
  dependencies: {
    mcpServers: string[]
    environmentVariables: string[]
    osRequirements: string[]
    runtimeRequirements: string[]
  }
  notes: string[]
}

const portabilityReport: PortabilityReport = {
  skillName: 'pay-skill',
  formatPortable: true,
  runtimePortable: false,
  dependencies: {
    mcpServers: ['stripe-mcp'],
    environmentVariables: ['STRIPE_API_KEY'],
    osRequirements: ['Node.js 18+'],
    runtimeRequirements: ['agent runtime with MCP support']
  },
  notes: [
    'SKILL.md instructions are portable across agents.',
    'scripts/validate_payment.js requires Node.js runtime.',
    'Requires Stripe MCP server and STRIPE_API_KEY environment variable.'
  ]
}
```

---

## 9. Programmatic API Integration

Interactive Skills are useful for humans.

But developers may also want Skills inside:

- SaaS applications
- backend services
- autonomous agents
- scheduled workflows
- multi-agent systems
- internal automation
- CI/CD pipelines

### Architecture:

```mermaid
flowchart TB
    U["User / Event"]
    APP["Your Application"]
    AGENT["Agent Runtime"]
    SKILL["Skill"]
    TOOLS["Tools / MCP"]
    EXT["External Systems"]

    U --> APP
    APP --> AGENT
    AGENT --> SKILL
    SKILL --> TOOLS
    TOOLS --> EXT

    EXT --> DB["Database"]
    EXT --> API["External API"]
    EXT --> GIT["GitHub"]
    EXT --> SAAS["SaaS Service"]
```

### The key separation:

```text
Skill
  ↓
How should the task be performed?

Tools / MCP
  ↓
What external capabilities can be accessed?

Agent Runtime
  ↓
Who executes the workflow?

Application / API
  ↓
How is the agent programmaticallly invoked?
```

---

## 10. Skills API

Anthropic provides a Skills API for managing custom Skills programmatically.

The current Anthropic implementation documents operations such as:

```text
POST   /v1/skills
GET    /v1/skills
GET    /v1/skills/{id}
DELETE /v1/skills/{id}

POST   /v1/skills/{id}/versions
GET    /v1/skills/{id}/versions
GET    /v1/skills/{id}/versions/{version}
DELETE /v1/skills/{id}/versions/{version}
```

This gives Skills a lifecycle similar to other software artifacts:

```mermaid
flowchart LR
    A["Create"] --> B["Version"]
    B --> C["Publish"]
    C --> D["Attach to Agent"]
    D --> E["Run"]
    E --> F["Evaluate"]
    F --> G["Create New Version"]
    G --> C
```

### Skills API client (TS/JS pseudo code):

```ts
interface Skill {
  id: string
  name: string
  description: string
  version: string
  status: 'draft' | 'published' | 'archived'
}

interface SkillVersion {
  id: string
  skillId: string
  versionNumber: string
  content: string
  createdAt: string
}

class SkillsApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async createSkill(skill: Omit<Skill, 'id'>): Promise<Skill> {
    const response = await fetch(`${this.baseUrl}/v1/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skill)
    })
    return response.json()
  }

  async getSkills(): Promise<Skill[]> {
    const response = await fetch(`${this.baseUrl}/v1/skills`)
    return response.json()
  }

  async getSkill(id: string): Promise<Skill> {
    const response = await fetch(`${this.baseUrl}/v1/skills/${id}`)
    return response.json()
  }

  async deleteSkill(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/v1/skills/${id}`, { method: 'DELETE' })
  }

  async createVersion(skillId: string, content: string): Promise<SkillVersion> {
    const response = await fetch(`${this.baseUrl}/v1/skills/${skillId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    return response.json()
  }

  async listVersions(skillId: string): Promise<SkillVersion[]> {
    const response = await fetch(`${this.baseUrl}/v1/skills/${skillId}/versions`)
    return response.json()
  }

  async attachSkillToAgent(agentId: string, skillId: string, version?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/agents/${agentId}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId, version: version || 'latest' })
    })
    return response.json()
  }
}
```

---

## 11. Skill Versioning

Versioning becomes important as soon as a Skill is used by multiple agents.

### Example:

```text
payment-gateway-builder
│
├── v1
├── v2
└── v3
```

A change from `v1.0.0` to `v2.0.0` might change:

- workflow
- tool requirements
- output format
- validation rules
- API assumptions
- scripts

Therefore, production agents should avoid silently receiving breaking changes.

### Recommended strategy:

```mermaid
flowchart LR
    DEV["Development"] --> EVAL["Evaluation"]
    EVAL --> STAGING["Staging"]
    STAGING --> PROD["Production"]

    DEV -->|v1.1.0| EVAL
    EVAL -->|v1.2.0| STAGING
    STAGING -->|v1.3.0| PROD
```

For high-risk workflows:

```text
Production Agent
       │
       └── Skill v1.4.2
```

rather than blindly using:

```text
latest
```

Anthropic's current API documentation supports attaching Skills with a specific version or `"latest"` in supported agent configurations.

### Version pinning (TS/JS pseudo code):

```ts
interface AgentSkillConfig {
  agentId: string
  skillId: string
  pinnedVersion?: string // e.g., '1.4.2'
  useLatest: boolean // false means pinned version is required
}

function resolveSkillVersion(config: AgentSkillConfig): string {
  if (config.useLatest) {
    return 'latest'
  }

  return config.pinnedVersion || 'latest'
}

function isBreakingChange(oldVersion: string, newVersion: string): boolean {
  const oldMajor = parseInt(oldVersion.split('.')[0])
  const newMajor = parseInt(newVersion.split('.')[0])
  return newMajor > oldMajor
}
```

---

## 12. Skills + MCP + API

These three concepts should not be confused.

```mermaid
flowchart TB
    USER["User"]
    AGENT["AI Agent"]
    SKILL["Skill"]
    MCP["MCP / Tools"]
    REF["References"]
    SCRIPT["Scripts"]

    USER --> AGENT
    AGENT --> SKILL
    SKILL --> MCP
    SKILL --> REF
    SKILL --> SCRIPT

    MCP --> GITHUB["GitHub"]
    MCP --> DB["Database"]
    MCP --> STRIPE["Payment API"]
    MCP --> SLACK["Slack"]

    style SKILL fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style MCP fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

### Skill

Defines:

> **How should the agent solve the problem?**

### MCP / Tools

Defines:

> **What can the agent access or execute?**

### API

Defines:

> **How does my application communicate with the agent platform?**

### External system

Provides:

> **The actual data or operation.**

### Side-by-side comparison:

| Component | Question Answered | Example |
|---|---|---|
| Skill | How should I do this? | "Create an enterprise subscription." |
| MCP | What can I access? | `payment.create_subscription` |
| API | How do I control the agent? | `POST /v1/skills` |
| External System | What is the actual operation? | Stripe Payment API |

---

## 13. Example: Payment Gateway Skill

Suppose we create:

```text
payment-gateway-builder/
├── SKILL.md
├── scripts/
│   └── validate_config.js
└── references/
    └── payment-api.md
```

The Skill might instruct the agent:

```text
1. Understand requested payment configuration.
2. Validate required fields.
3. Inspect existing project configuration.
4. Read payment API requirements.
5. Configure the payment provider.
6. Run deterministic validation.
7. Report configuration changes.
8. Never claim deployment succeeded unless deployment was verified.
```

MCP might provide:

```text
payment.create_product
payment.create_price
payment.list_customers
payment.create_subscription
```

So:

```text
User:
"Create an enterprise subscription."

        ↓

Skill:
"What steps must I follow?"

        ↓

MCP:
"What payment operations can I perform?"

        ↓

Payment API:
"Actually create the subscription."
```

### Mermaid visualization:

```mermaid
flowchart TB
    USER["User Request"]
    SKILL["Skill: Payment Gateway Builder"]
    MCP["MCP: Payment Tools"]
    API["Payment API / Stripe"]

    USER --> SKILL
    SKILL --> MCP
    MCP --> API

    SKILL --> STEP1["Validate input"]
    SKILL --> STEP2["Configure provider"]
    SKILL --> STEP3["Run validation"]
    SKILL --> STEP4["Report changes"]
```

---

## 14. GitHub Distribution

GitHub is a natural distribution mechanism for open-source Skills.

A clean repository can separate:

- human documentation
- Skill implementation
- examples
- tests
- license

### Example repository structure:

```text
payflow-skill/
│
├── README.md
├── LICENSE
├── CHANGELOG.md
│
├── skill/
│   └── payflow-integration/
│       ├── SKILL.md
│       ├── scripts/
│       │   └── validate.js
│       ├── references/
│       │   └── api-schema.md
│       └── assets/
│           └── config-template.json
│
└── tests/
    ├── trigger-tests.md
    └── workflow-tests.md
```

### Human documentation (`README.md`):

Explains:

- what the Skill does
- installation
- requirements
- examples
- limitations
- version history

### Agent documentation (`SKILL.md`):

Contains:

- metadata
- instructions
- workflow
- validation rules
- tool usage guidance

This separation is extremely useful.

---

## 15. Example Installation Documentation

A good README should answer:

```text
What is it?
Why should I use it?
How do I install it?
What does it require?
How do I use it?
What tools does it need?
How do I update it?
```

### Example:

```markdown
# PayFlow Integration Skill

A reusable agent Skill for configuring PayFlow
payment integrations.

## Requirements

- Compatible agent runtime
- PayFlow MCP server
- Valid PayFlow credentials

## Installation

Clone this repository:

git clone https://github.com/example/payflow-skill.git

Then install the Skill using the mechanism
supported by your agent environment.

## Example

Ask your agent:

"Configure an enterprise subscription plan."

## Important

The Skill does not replace PayFlow authentication.
Required credentials must be configured separately.
```

### Notice the difference:

**Bad README:**

```text
This repository contains SKILL.md and Python files.
```

**Better README:**

```text
Configure PayFlow integrations through a reusable
agent workflow with validation and API guidance.
```

The second approach explains what it does for the user, not just what it is internally.

---

## 16. Positioning: Sell the Outcome, Not the Folder

A Skill is technically a folder.

But users do not care about the folder.

They care about the result.

### Implementation-focused:

> "This Skill contains Markdown instructions and JavaScript scripts."

This explains **what it is internally**.

### Outcome-focused:

> "This Skill helps teams configure payment integrations using a repeatable workflow with validation and deployment checks."

This explains **what it does for the user**.

The second approach is generally more useful for:

- README files
- marketplaces
- product pages
- documentation
- internal catalogs

---

## 17. Skill Discovery

Distribution is not enough.

An agent must also know:

> **When should I use this Skill?**

That is why the `description` field is extremely important.

### Example:

```yaml
---
name: payment-gateway-builder
description: >
  Configure payment products, prices, and subscriptions
  using the organization's payment workflow. Use when the
  user asks to create or modify payment configuration.
---
```

Think of the description as the Skill's:

```text
Discovery Interface
```

while the body is its:

```text
Execution Interface
```

```mermaid
flowchart TD
    U["User Request"]

    U --> D["Skill Description"]

    D -->|"Relevant?"| Y["Activate Skill"]

    D -->|"Not Relevant"| N["Do Not Activate"]

    Y --> S["Read SKILL.md"]

    S --> R["Load References / Scripts"]

    R --> E["Execute Workflow"]
```

### Discovery flow (TS/JS pseudo code):

```ts
interface SkillDiscovery {
  skills: Skill[]
}

interface Skill {
  id: string
  name: string
  description: string
  relevantFor: string[] // intent keywords
}

function discoverSkills(
  userRequest: string,
  availableSkills: SkillDiscovery
): Skill[] {
  const relevant: Skill[] = []

  for (const skill of availableSkills.skills) {
    const descriptionMatches = skill.relevantFor.some((keyword) =>
      userRequest.toLowerCase().includes(keyword.toLowerCase())
    )

    if (descriptionMatches) {
      relevant.push(skill)
    }
  }

  return relevant.sort((a, b) => b.description.length - a.description.length)
}
```

---

## 18. Progressive Disclosure During Distribution

Distribution and progressive disclosure work together.

A large Skill repository may contain:

```text
100 Skills
```

but an agent does not need to load all their instructions into context simultaneously.

The general pattern is:

```text
Level 1
Metadata
   ↓
Level 2
SKILL.md
   ↓
Level 3
References / Scripts / Assets
```

This allows many Skills to coexist without requiring every detailed instruction to be loaded at once. The Agent Skills documentation explicitly describes this three-stage discovery → activation → execution model.

### Progressive disclosure levels:

| Level | Content | When Loaded |
|-------|---------|-------------|
| 1 | Metadata (name, description) | Always — for discovery |
| 2 | SKILL.md instructions | When Skill is activated |
| 3 | References, scripts, assets | When the workflow needs them |

---

## 19. Security Considerations

Distributed Skills should be treated as executable agent instructions.

This is particularly important when a Skill contains scripts or interacts with tools.

### Potential risks include:

- malicious instructions
- unsafe shell commands
- credential leakage
- unauthorized API calls
- malicious repository changes
- prompt injection through referenced documents
- compromised dependencies

### Trust model:

```mermaid
flowchart TD
    SKILL["Third-Party Skill"]

    SKILL --> REVIEW["Review Source"]
    REVIEW --> PERM["Check Permissions"]
    PERM --> DEP["Check Dependencies"]
    DEP --> TEST["Run in Safe Environment"]
    TEST --> PROD["Production"]
```

### Useful rule:

> **Do not treat a Skill as harmless documentation simply because its instructions are written in Markdown.**

If the agent has tools such as shell, filesystem, web access, or APIs, the Skill's instructions can influence real actions.

Repository Skills are part of the agent's trust boundary and should be audited before being used with powerful tools.

---

## 20. Credential Separation

Never hard-code secrets inside:

```text
SKILL.md
```

or:

```text
scripts/
```

### Bad:

```python
API_KEY = "sk_live_123456..."
```

### Better:

```python
import os

api_key = os.environ["PAYFLOW_API_KEY"]
```

### Even better architecture:

```mermaid
flowchart LR
    SKILL["Skill"]

    SKILL --> ENV["Environment / Secret Manager"]

    ENV --> APIKEY["API Credential"]

    SKILL --> TOOL["MCP / API Tool"]

    APIKEY --> TOOL
```

The Skill should describe **how to use a credential**, not contain the credential itself.

### Credential resolution (TS/JS pseudo code):

```ts
interface CredentialSource {
  name: string
  type: 'env' | 'secret-manager' | 'runtime-auth'
  value?: string
}

function resolveCredential(source: CredentialSource): string | null {
  switch (source.type) {
    case 'env':
      return process.env[source.name]
    case 'secret-manager':
      return fetchSecret(source.name)
    case 'runtime-auth':
      return getRuntimeCredential(source.name)
    default:
      return null
  }
}

function validateNoHardcodedSecrets(skillContent: string): boolean {
  const secretPattern = /(sk_|api[_-]?key|secret|password)\s*=\s*["'][^"']+["']/i
  return !secretPattern.test(skillContent)
}
```

---

## 21. Distribution Testing

A Skill should be tested after packaging.

Test at least:

### Installation

```text
Can the Skill be installed?
```

### Discovery

```text
Can the agent discover it?
```

### Triggering

```text
Does it activate for relevant requests?
```

### Non-triggering

```text
Does it stay inactive for unrelated requests?
```

### Execution

```text
Do scripts and references work?
```

### Dependencies

```text
Are required tools available?
```

### Versioning

```text
Does the correct version load?
```

### Security

```text
Does it behave safely with malicious input?
```

### Distribution testing matrix:

| Test | Expected | Tool / Method |
|------|----------|---------------|
| Installation | Skill installs without errors | CLI / Platform UI |
| Discovery | Agent finds Skill for relevant queries | Trigger test suite |
| Non-triggering | Skill stays inactive for unrelated queries | Negative test suite |
| Execution | Workflow completes successfully | Functional tests |
| Dependencies | All required tools available | Environment check |
| Versioning | Correct version loads | Version pinning check |
| Security | No secrets in files, safe with bad input | Security scan |

---

## 22. Distribution Quality Checklist

| Area | Question |
|------|----------|
| Packaging | Is the Skill self-contained? |
| Metadata | Is `name` clear? |
| Discovery | Is `description` specific? |
| Installation | Can users install it easily? |
| Dependencies | Are requirements documented? |
| Versioning | Are releases versioned? |
| Testing | Are trigger/workflow tests included? |
| Security | Are secrets excluded? |
| Documentation | Is README useful to humans? |
| Portability | Are platform-specific requirements documented? |
| Maintenance | Is there a clear update strategy? |

---

## 23. Production Distribution Pipeline

A mature Skill can follow a software-style release process:

```mermaid
flowchart LR
    A["Develop"] --> B["Local Test"]

    B --> C["Trigger Tests"]
    C --> D["Functional Tests"]
    D --> E["Security Tests"]

    E --> F["Version"]

    F --> G["Publish"]

    G --> H["Staging"]
    H --> I["Production"]

    I --> J["Monitor"]

    J --> K["Feedback"]

    K --> A
```

This is essentially:

> **Skills Engineering = Software Engineering + Agent Behavior Engineering**

---

## 24. Complete Skill Distribution Architecture

Putting everything together:

```mermaid
flowchart TB
    DEV["Skill Developer"]

    DEV --> GIT["Git Repository"]

    GIT --> SKILL["Skill Package"]

    SKILL --> META["SKILL.md"]
    SKILL --> SCRIPT["Scripts"]
    SKILL --> REF["References"]
    SKILL --> ASSET["Assets"]

    SKILL --> DIST["Distribution"]

    DIST --> CLAUDE["Claude.ai"]
    DIST --> CODE["Claude Code"]
    DIST --> API["Programmatic API"]
    DIST --> OTHER["Compatible Agent Platforms"]

    CLAUDE --> AGENT["Agent Runtime"]
    CODE --> AGENT
    API --> AGENT
    OTHER --> AGENT

    AGENT --> MCP["MCP / Tools"]

    MCP --> EXT1["GitHub"]
    MCP --> EXT2["Database"]
    MCP --> EXT3["SaaS API"]
    MCP --> EXT4["Internal Services"]
```

This gives the complete mental model:

```text
Skill
 ↓
Package
 ↓
Version
 ↓
Distribute
 ↓
Discover
 ↓
Activate
 ↓
Execute
 ↓
Evaluate
 ↓
Update
```

---

## 25. Skill vs MCP vs API vs Repository

| Component | Main Responsibility |
|-----------|---------------------|
| **Skill** | Instructions, workflow, domain knowledge |
| **SKILL.md** | Skill entry point and instructions |
| **Scripts** | Deterministic executable logic |
| **References** | Detailed supporting knowledge |
| **MCP** | Standardized connection to tools/resources |
| **API** | Programmatic interface to an AI platform/service |
| **GitHub** | Versioning and distribution mechanism |
| **Agent Runtime** | Executes the agent workflow |
| **External API** | Performs the actual business operation |

### One-line mental model:

> **Git distributes the Skill, the Skill teaches the workflow, MCP exposes capabilities, and the agent runtime executes the work.**

---

## 26. Real-World Example

Imagine you build:

```text
react-native-expert/
```

The Skill contains:

```text
react-native-expert/
├── SKILL.md
├── scripts/
│   ├── check_dependencies.js
│   └── validate_navigation.js
├── references/
│   ├── expo.md
│   ├── navigation.md
│   └── performance.md
└── assets/
    └── project-template/
```

A user asks:

> "Add authentication navigation to my React Native Expo application."

### The flow could be:

```mermaid
sequenceDiagram
    participant U as User
    participant A as Agent
    participant S as React Native Skill
    participant M as MCP / Tools
    participant R as Repository

    U->>A: Add authentication navigation

    A->>S: Activate relevant Skill

    S->>A: Follow architecture workflow

    A->>R: Inspect existing navigation

    A->>S: Load navigation reference

    A->>M: Use repository/file tools

    M->>R: Modify project

    A->>A: Run validation

    A-->>U: Explain changes + validation
```

The Skill does not need to contain the entire React Native documentation.

Instead:

```text
SKILL.md
    ↓
High-level workflow

references/
    ↓
Detailed knowledge

scripts/
    ↓
Deterministic validation
```

That is progressive disclosure applied to a real development workflow.

---

## 27. Interview Questions

### Q1. How do you distribute an Agent Skill?

A Skill is distributed as a structured directory containing `SKILL.md` and optional supporting resources such as scripts, references, and assets. Depending on the runtime, it can be installed locally, committed to a project repository, distributed through a plugin/marketplace mechanism, or managed through an API.

### Q2. What is the Agent Skills open standard?

Agent Skills is an open format for packaging reusable agent instructions and resources. Its core structure is a Skill directory containing `SKILL.md`, with optional scripts, references, and assets. It was originally developed by Anthropic and is intended to support reuse across compatible agent implementations.

### Q3. Does an open Skill automatically work identically on every AI platform?

No.

The Skill format can be portable, but the runtime may have different:

- tool APIs
- filesystem access
- execution environments
- MCP integrations
- authentication mechanisms
- supported features

Therefore, portability of the **format** does not guarantee identical portability of the **behavior**.

### Q4. Why use GitHub for Skills?

GitHub provides:

- version control
- collaboration
- code review
- release history
- issue tracking
- distribution
- documentation

It allows Skills to be maintained similarly to software projects.

### Q5. Why should credentials not be stored inside a Skill?

Because a Skill may be shared, committed to source control, or installed by other users. Credentials should instead be provided through secure environment variables, secret managers, or the runtime's authentication mechanism.

### Q6. What is the difference between Skill and MCP?

A Skill defines **how a task should be performed**.

MCP provides standardized access to **tools and external resources**.

Simple formula:

```text
Skill = Procedure
MCP = Connectivity
```

### Q7. Why is Skill versioning important?

Because changing a Skill can change agent behavior. Versioning allows developers to test, release, roll back, and pin known-good versions rather than unexpectedly changing production agent behavior.

### Q8. What should a good Skill README contain?

At minimum:

```text
Purpose
Installation
Requirements
Usage examples
Dependencies
Security considerations
Version information
Limitations
```

---

## 28. Chapter 4 Cheat Sheet

```text
┌─────────────────────────────────────┐
│       AGENT SKILL DISTRIBUTION      │
├─────────────────────────────────────┤
│ SKILL.md                            │
│   ↓                                 │
│ Package                             │
│   ↓                                 │
│ Version                             │
│   ↓                                 │
│ Distribution                        │
│   ├── Claude.ai                     │
│   ├── Claude Code                   │
│   ├── Repository                    │
│   ├── Plugins / Marketplaces        │
│   └── API / Agent Runtime           │
│                                     │
│ Discovery → Activation → Execution  │
│                                     │
│ Skill = Procedure                   │
│ MCP   = Connectivity                │
│ API   = Programmatic Interface     │
│ Git   = Versioning + Distribution   │
└─────────────────────────────────────┘
```

### Remember these 8 points:

1. **A Skill is a distributable capability package.**
2. **`SKILL.md` is the required entry point.**
3. **Scripts, references, and assets are optional supporting resources.**
4. **Agent Skills is an open standard originally developed by Anthropic.**
5. **Portability of the format does not guarantee identical runtime behavior.**
6. **GitHub is useful for versioning, collaboration, and distribution.**
7. **Skills API enables programmatic Skill management in supported Anthropic environments.**
8. **Never put secrets directly inside Skill files.**

---

## 29. Final Mental Model

The complete architecture across Chapters 1–4:

```mermaid
flowchart LR

    USER["User"]

    USER --> AGENT["AI Agent"]

    AGENT --> SKILL["Skill"]

    SKILL --> PROC["Instructions + Workflow"]

    SKILL --> REF["References"]
    SKILL --> SCRIPT["Scripts"]
    SKILL --> ASSET["Assets"]

    SKILL --> MCP["MCP / Tools"]

    MCP --> EXT["External Systems"]

    EXT --> DB["Database"]
    EXT --> API["APIs"]
    EXT --> SAAS["SaaS"]
    EXT --> GIT["GitHub"]

    SKILL -. "Distributed through" .-> DIST["Git / Platform / API"]

    DIST --> AGENT
```

### The entire concept in one sentence:

> **Agent Skills package reusable procedures and domain knowledge into portable folders, distribute them through compatible agent environments, and combine them with tools such as MCP so agents can execute reliable real-world workflows.**

### Chapter progression:

```text
Chapter 1
WHAT ARE SKILLS?
       ↓
Chapter 2
HOW DO WE DESIGN THEM?
       ↓
Chapter 3
HOW DO WE TEST THEM?
       ↓
Chapter 4
HOW DO WE DISTRIBUTE & INTEGRATE THEM?
       ↓
Chapter 5
HOW DO WE ARCHITECT & TROUBLESHOOT THEM?
```

**Key correction:** Avoid memorizing any claim that every API Skill invocation is simply `container.skills` plus a Code Execution beta container. Anthropic's current Skill/agent documentation now documents Skills API management and agent-level Skill attachment as well.

For your MCP/agent-learning path, the most important mental model from this chapter is:

> **Skill = procedure, MCP = connectivity, API = programmatic interface, runtime = execution**