# Chapter 1 — Environment Setup (Commands & Config)

## 1. What You Need

- **Node.js** ≥ 20 (we have v24.22.0)
- **npm** (v11.19.1)
- **TypeScript** 7.0.2 (dev dependency, used for compilation)
- **tsx** (dev dependency, runs TypeScript directly without compiling)

## 2. Commands to Run

```bash
# 1. Create the folder structure
mkdir -p src/{config,controllers,middleware,services,types}

# 2. Initialise npm (creates package.json)
npm init -y

# 3. Install Express (runtime)
npm install express

# 4. Install dev dependencies (TypeScript, tsx, type definitions)
npm install -D typescript tsx @types/express @types/node @types/dotenv

# 5. (Optional) install dotenv for loading .env
npm install dotenv
```

## 3. Package.json — What It Does

```json
{
  "name": "fde-lecture-12-vector-embeddings",
  "version": "1.0.0",
  "description": "Basic Code — Vector Embeddings Mastery (Lecture 12)",
  "type": "module",                     // Use ES modules (import/export)
  "main": "src/index.ts",               // Entry point
  "scripts": {
    "dev": "tsx src/index.ts",          // Run TS directly without compiling
    "build": "tsc",                     // Compile src/ → dist/
    "start": "node dist/index.js",      // Run compiled JS
    "test": "tsx src/index.ts"          // Run the code (e.g. for testing)
  },
  "dependencies": {
    "express": "^5.3.0",                // Web framework
    "dotenv": "^16.4.7"                 // Load .env files
  },
  "devDependencies": {
    "@types/express": "^5.0.6",         // TypeScript types for Express
    "@types/node": "^26.6.5",           // TypeScript types for Node.js
    "tsx": "^4.23.15",                  // Run TS in dev mode
    "typescript": "^7.0.2"              // Compiler (v5.x is fine too)
  }
}
```

## 4. tsconfig.json — What It Does

```json
{
  "compilerOptions": {
    "target": "ES2022",           // Output ES2022 JavaScript
    "module": "NodeNext",         // Use Node.js ES module syntax
    "moduleResolution": "NodeNext", // Resolve imports like Node.js does
    "rootDir": "src",             // Source folder
    "outDir": "dist",             // Output folder after compile
    "strict": true,               // Enable all strict type checks
    "esModuleInterop": true,      // Allow import express from 'express'
    "allowSyntheticDefaultImports": true, // Allow default imports from CJS
    "skipLibCheck": true,         // Skip type-checking .d.ts files
    "resolveJsonModule": true,    // Allow importing .json files
    "forceConsistentCasingInFileNames": true // Case-sensitive imports
  },
  "include": ["src/**/*.ts"],     // Compile all .ts files in src/
  "exclude": ["node_modules", "dist"] // Don't compile these folders
}
```

## 5. .env — What It Does

```env
NODE_ENV=development
PORT=4000
DEFAULT_VECTOR_DIM=8
MAX_SENTENCES=30
```

This file holds configuration. The app loads it with `dotenv.config()` in `src/config/config.ts`.
