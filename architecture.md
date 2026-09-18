# Architecture

## System Architecture

This is a single Next.js 16 (App Router) application that serves as both frontend and backend — there's no separate API server.


- **Frontend**: React 19 + Tailwind v4 + shadcn/ui 
- **Backend**: Next.js Route Handlers under `app/api/**/route.ts`. Most routes are `POST` (create account, deposit, issue card, process transaction); `GET /api/accounts` reads everything back with accounts with their embedded card and transaction history in one Supabase query which is used to hyrdate dashboard on load.
- **Database**: Supabase, accessed **only from Route Handlers**, never from the browser. `lib/supabase/server.ts` creates the Supabase client using the **service role key**, guarded by the `server-only` package so it can't accidentally leak into client-side JS.
- **No authentication layer.** A mock login screen was built early on, then deliberately removed to keep scope focused on the assignment's core HSA/transaction requirements. `/` redirects straight to `/dashboard`, and the app is open by design.
- **State management**: plain React `useState` at the `app/dashboard/page.tsx` level (`accounts`, `cards`, `transactions`), passed down via props and updated via callbacks. 

## Request Flow

Every action follows the same shape: **Client Component → `fetch()` → Route Handler → Zod validation → Supabase → Postgres → mapped response → React state update.**

There are 3 RPC functions that user requests go through when depositing funds, sending transactions, and giving transaction statuses. 

- **`deposit_funds(account_id, amount)`**: `UPDATE accounts SET balance = balance + amount WHERE id = account_id RETURNING *`. Function allows to update balance directly from the server side data, I made this choice system logic wouldn't rely on stale balance from local app. 
- **`process_transaction(account_id, amount, category)`**: `UPDATE accounts SET balance = balance - amount WHERE id = account_id AND balance >= amount RETURNING *`, then always inserts an audit row into `transactions` — `status = 'approved'` if the update matched a row, or `status = 'declined', reason = 'Insufficient funds'` if it didn't. This function allows for concurrenct transactions to be passed by locking one transaction and allowing one transaction to update balance directly to server side.
- **`decline_transaction(account_id, amount, category, reason)`**: a separate, lighter function for declines that never touch the balance at all (failing the qualified-expense check happens before Postgres is even called). Still writes an audit row so every attempted transaction — approved or declined, for either reason — is recorded with why.

## Design Tradeoffs / Known Limitations

1. **No authentication.** Deliberately scoped out to focus time on the core HSA/transaction/concurrency requirements.
2. **Accounts aren't linked to a user.** Accounts aren't linked to a user, more focused onto the core features of project scope. Adding an authentication layer such as username and password would be the next evolution.
3. **Service role key bypasses Row Level Security entirely.** Acceptable with no real auth in place; would need real RLS policies + the anon/publishable key once auth exists.
4. **Mock card numbers are stored in plaintext**, masked only at the UI layer which is acceptable given there is no real payment integration.
5. **State management is local `useState`, not a global store.** Appropriate at the current scope (one primary route, shallow prop-passing), but would need revisiting if the app grows more routes that need the same data.
6. **Qualified-expense categories are a hardcoded allowlist** (`Pharmacy`, `Hospital`) in `lib/qualified-expense.ts`, not configurable or database-driven. Real world applications would have some sort of classification engine for each individual product for HSA cards.
7. Removing HSA accounts that would allow deletion from reviewer side to server side data.
8. No real payment integrations, adding only virtual cards for display purposes only and linking of transaction history.
9. Only limiting one card per HSA account, usually for real world HSA application there would be option to add multiple cards under different names and relationships. (Cardholder, family member, spouse, or etc)