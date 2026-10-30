---
name: fundamental-skill
description: >
  Demonstrates a basic Claude Skill structure with
  workflow, validation, and deterministic script usage.
  Use when learning Skill fundamentals from Lecture 23 notes.
---

# Fundamental Skill

## Purpose

A minimal Skill example demonstrating the core Skill
structure from Chapter 1 and Chapter 2 of the notes.

## When to Use

Use this Skill when learning how to structure a Claude Skill
with metadata, workflow instructions, and basic validation.

## Inputs

Required:

- task: the task description to process

Optional:

- context: additional context for the task

## Workflow

### Step 1 — Validate Input

Check that the required `task` input is provided.
Do not continue if required input is missing.

### Step 2 — Process Task

Use the task description to perform the requested operation.
Reference supporting materials from `references/` when needed.

### Step 3 — Validate Result

Verify the produced result before returning it to the user.
Do not claim success unless validation passes.

### Step 4 — Return Output

Return the result, status, and any warnings.

## Output

Return:

- result
- status
- warnings (if any)

## Error Handling

| Error                  | Cause                      | Action       |
| ---------------------- | -------------------------- | ------------ |
| Missing task input     | Required parameter absent  | Ask user     |
| Validation failure     | Invalid input data         | Fix input    |
| Processing failure     | Tool or script error       | Report error |
