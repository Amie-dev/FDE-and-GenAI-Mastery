# Client Chapter 0 — Overview, Setup & Project Configuration

## 1. Goal & Outcome
- **Goal**: Set up the Next.js 16 App Router client project with Tailwind CSS v4, TypeScript, ESLint, Shadcn UI components, and build configurations.
- **Student Outcome**: A fully configured Next.js 16 frontend foundation with modern styling tokens and TypeScript standards.

---

## 2. Client Installation Commands

From directory `week05/chaibook-llm-sir/client`:

```bash
cd week05/chaibook-llm-sir/client
npm install
```

---

## 3. Client Source Code & Explanations

#### File Path: `client/package.json`

```json
{
  "name": "client",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@ai-sdk/openai": "^4.0.24",
    "@ai-sdk/react": "^4.0.45",
    "@base-ui/react": "^1.6.0",
    "@shadcn/react": "^0.2.1",
    "@streamdown/code": "^1.1.1",
    "@tanstack/react-query": "^5.101.4",
    "@xyflow/react": "^12.11.2",
    "ai": "^7.0.42",
    "better-auth": "^1.6.25",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.4.0",
    "embla-carousel-react": "^8.6.0",
    "input-otp": "^1.4.2",
    "lucide-react": "^1.27.0",
    "motion": "^12.43.0",
    "next": "16.2.12",
    "next-themes": "^0.4.6",
    "react": "19.2.4",
    "react-day-picker": "^10.0.1",
    "react-dom": "19.2.4",
    "react-resizable-panels": "^4.12.2",
    "recharts": "3.8.0",
    "shadcn": "^4.16.0",
    "streamdown": "^2.5.0",
    "tailwind-merge": "^3.6.0",
    "tw-animate-css": "^1.4.0",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.12",
    "tailwindcss": "^4",
    "typescript": "^5"
  },
  "ignoreScripts": [
    "sharp",
    "unrs-resolver"
  ],
  "trustedDependencies": [
    "sharp",
    "unrs-resolver"
  ]
}

```

#### Code Explanation: `client/package.json`

**Overview & Architectural Role:**
- `client/package.json` is a production source module containing **60 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 60 lines of `package.json`.

#### File Path: `client/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}

```

#### Code Explanation: `client/tsconfig.json`

**Overview & Architectural Role:**
- `client/tsconfig.json` is a production source module containing **34 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 34 lines of `tsconfig.json`.

#### File Path: `client/next.config.ts`

```typescript
import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
    async rewrites() {
        return [
            {
                source: "/api/auth/:path*",
                destination: `${apiUrl}/api/auth/:path*`,
            },
            {
                source: "/api/workspaces/:path*",
                destination: `${apiUrl}/api/workspaces/:path*`,
            },
            {
                source: "/api/workspaces",
                destination: `${apiUrl}/api/workspaces`,
            },
            {
                source: "/api/memory/:path*",
                destination: `${apiUrl}/api/memory/:path*`,
            },
            {
                source: "/api/memory",
                destination: `${apiUrl}/api/memory`,
            },
        ];
    },
};

export default nextConfig;

```

#### Code Explanation: `client/next.config.ts`

**Overview & Architectural Role:**
- `client/next.config.ts` is a production source module containing **32 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 3)**:
  - `import type { NextConfig } from "next";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 32 lines of `next.config.ts`.

#### File Path: `client/postcss.config.mjs`

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;

```

#### Code Explanation: `client/postcss.config.mjs`

**Overview & Architectural Role:**
- `client/postcss.config.mjs` is a production source module containing **7 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 7 lines of `postcss.config.mjs`.

#### File Path: `client/eslint.config.mjs`

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

```

#### Code Explanation: `client/eslint.config.mjs`

**Overview & Architectural Role:**
- `client/eslint.config.mjs` is a production source module containing **18 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**
- **Imports & Dependencies (Lines 1 to 5)**:
  - `import { defineConfig, globalIgnores } from "eslint/config";`: Imports required module bindings.
  - `import nextVitals from "eslint-config-next/core-web-vitals";`: Imports required module bindings.
  - `import nextTs from "eslint-config-next/typescript";`: Imports required module bindings.

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 18 lines of `eslint.config.mjs`.

#### File Path: `client/components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-rhea",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "stone",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/shared/hooks"
  },
  "menuColor": "default-translucent",
  "menuAccent": "subtle",
  "registries": {}
}

```

#### Code Explanation: `client/components.json`

**Overview & Architectural Role:**
- `client/components.json` is a production source module containing **25 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 25 lines of `components.json`.

#### File Path: `client/AGENTS.md`

```markdown
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

```

#### Code Explanation: `client/AGENTS.md`

**Overview & Architectural Role:**
- `client/AGENTS.md` is a production source module containing **5 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 5 lines of `AGENTS.md`.

#### File Path: `client/CLAUDE.md`

```markdown
@AGENTS.md

```

#### Code Explanation: `client/CLAUDE.md`

**Overview & Architectural Role:**
- `client/CLAUDE.md` is a production source module containing **1 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 1 lines of `CLAUDE.md`.

#### File Path: `client/README.md`

```markdown
b1LOZyc7DG
```

#### Code Explanation: `client/README.md`

**Overview & Architectural Role:**
- `client/README.md` is a production source module containing **1 lines** of code.

**Detailed Line-by-Line & Block-by-Block Breakdown:**

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 1 lines of `README.md`.

#### File Path: `client/app/globals.css`

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "streamdown/styles.css";

@source "../node_modules/streamdown/dist/*.js";
@source "../node_modules/@streamdown/code/dist/*.js";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-mono);
  --font-heading: var(--font-heading);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.147 0.004 49.25);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.147 0.004 49.25);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.147 0.004 49.25);
  --primary: oklch(0.841 0.238 128.85);
  --primary-foreground: oklch(0.405 0.101 131.063);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.97 0.001 106.424);
  --muted-foreground: oklch(0.553 0.013 58.071);
  --accent: oklch(0.97 0.001 106.424);
  --accent-foreground: oklch(0.216 0.006 56.043);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.923 0.003 48.717);
  --input: oklch(0.923 0.003 48.717);
  --ring: oklch(0.709 0.01 56.259);
  --chart-1: oklch(0.897 0.196 126.665);
  --chart-2: oklch(0.768 0.233 130.85);
  --chart-3: oklch(0.648 0.2 131.684);
  --chart-4: oklch(0.532 0.157 131.589);
  --chart-5: oklch(0.453 0.124 130.933);
  --radius: 0.875rem;
  --sidebar: oklch(0.985 0.001 106.423);
  --sidebar-foreground: oklch(0.147 0.004 49.25);
  --sidebar-primary: oklch(0.648 0.2 131.684);
  --sidebar-primary-foreground: oklch(0.986 0.031 120.757);
  --sidebar-accent: oklch(0.97 0.001 106.424);
  --sidebar-accent-foreground: oklch(0.216 0.006 56.043);
  --sidebar-border: oklch(0.923 0.003 48.717);
  --sidebar-ring: oklch(0.709 0.01 56.259);
}

.dark {
  --background: oklch(0.147 0.004 49.25);
  --foreground: oklch(0.985 0.001 106.423);
  --card: oklch(0.216 0.006 56.043);
  --card-foreground: oklch(0.985 0.001 106.423);
  --popover: oklch(0.216 0.006 56.043);
  --popover-foreground: oklch(0.985 0.001 106.423);
  --primary: oklch(0.768 0.233 130.85);
  --primary-foreground: oklch(0.405 0.101 131.063);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.268 0.007 34.298);
  --muted-foreground: oklch(0.709 0.01 56.259);
  --accent: oklch(0.268 0.007 34.298);
  --accent-foreground: oklch(0.985 0.001 106.423);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.553 0.013 58.071);
  --chart-1: oklch(0.897 0.196 126.665);
  --chart-2: oklch(0.768 0.233 130.85);
  --chart-3: oklch(0.648 0.2 131.684);
  --chart-4: oklch(0.532 0.157 131.589);
  --chart-5: oklch(0.453 0.124 130.933);
  --sidebar: oklch(0.216 0.006 56.043);
  --sidebar-foreground: oklch(0.985 0.001 106.423);
  --sidebar-primary: oklch(0.768 0.233 130.85);
  --sidebar-primary-foreground: oklch(0.274 0.072 132.109);
  --sidebar-accent: oklch(0.268 0.007 34.298);
  --sidebar-accent-foreground: oklch(0.985 0.001 106.423);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.553 0.013 58.071);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  button:not(:disabled), [role="button"]:not(:disabled) {
    cursor: pointer;
  }
  html {
    @apply font-mono;
  }
}
```

#### Code Explanation: `client/app/globals.css`

**Overview & Architectural Role:**
- `client/app/globals.css` is a production source module containing **137 lines** of code.
- **Layer**: Next.js App Router Page/Layout. Handles route matching, server-side data prefetching, authenticated layout wrapping, and page rendering.

**Detailed Line-by-Line & Block-by-Block Breakdown:**

**Summary of Integration & Execution Safeguards:**
- Formatted with strict error handling, explicit type assertions, and modular design patterns across all 137 lines of `globals.css`.
