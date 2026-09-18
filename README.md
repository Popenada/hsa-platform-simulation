
## Demo Video

[\[Link to demo video\]](https://drive.google.com/file/d/1h2Efq9tGoXiQ7PkXz2UgWons8df41GXf/view?usp=sharing)

# HSA Platform

A simulated Health Savings Account (HSA) platform: create accounts, deposit funds, issue virtual debit cards, and process transactions against a qualified-medical-expense check with concurrency-safe balance handling. Built with Next.js (App Router) and Supabase.

See [architecture.md](architecture.md) for system design, data model, and concurrency handling, and [ai-usage.md](ai-usage.md) for how AI was used and verified during development.



## Prerequisites

- Node.js 22+
- A free [Supabase](https://supabase.com) project

## 1. Install dependencies

```bash
npm install
```

## 2. Set up the database

1. Create a new Supabase project.
2. Open the **SQL Editor** in your Supabase dashboard.
3. Run the contents of [`supabase/schema.sql`](supabase/schema.sql) — this creates the `accounts`, `cards`, and `transactions` tables and the atomic `deposit_funds`, `process_transaction`, and `decline_transaction` functions that enforce the concurrency guarantees.

## 3. Configure environment variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Both values are in your Supabase dashboard under **Project Settings → API**. Use the **`service_role`** (secret) key, not the `anon`/publishable one. The server needs it to write data without Row Level Security in place.

## 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If port 3000 is already in use on your machine, Next.js will pick another port automatically — check the terminal output for the actual URL.

There's no login, the app opens straight to the dashboard.

## 5. Run the tests

```bash
npm test
```

This runs two suites:
- **`lib/qualified-expense.test.ts`** — a pure unit test of the merchant-category classification logic, no server required.
- **`tests/concurrent-transactions.test.ts`** — an integration test that fires real concurrent HTTP requests at your **running dev server** (started in step 4), proving the balance-safety guarantee against real Supabase. If your dev server isn't on port 3000, point the test at it:
  ```bash
  TEST_BASE_URL=http://localhost:3001 npm test
  ```

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- [Supabase](https://supabase.com) (Postgres) for persistence
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Zod](https://zod.dev) for request validation
- [Vitest](https://vitest.dev) for testing
