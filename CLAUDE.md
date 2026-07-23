# SchemaCraft AI

## Project

SchemaCraft AI is an AI-powered SaaS that generates:

- SQL Schema
- Drizzle ORM Models
- Dummy JSON
- Database Documentation

from natural language prompts.

---

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- shadcn/ui
- App Router
- React Server Components
- Google Gemini (`@google/genai`)
- Supabase
- Drizzle ORM

---

## Coding Rules

- Never use `any`.
- Prefer React Server Components.
- Use TypeScript everywhere.
- Keep UI components reusable.
- Backend logic belongs inside Server Actions.
- Explain React concepts using backend analogies.

---

## Folder Structure

app/

components/

lib/

types/

supabase/

---

## Developer Context

The lead developer is an experienced backend engineer with Java, PL/SQL, SQL, .NET, REST API and enterprise architecture experience.

Whenever frontend concepts are introduced:

- explain why
- explain how
- compare them to backend architecture.

Always explain changes before implementing them.

After each implementation summarize:

- Files changed
- Purpose
- Data flow
- Important React concepts