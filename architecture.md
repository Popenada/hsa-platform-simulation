# Architecture

## System Architecture

This is a single Next.js 16 (App Router) application that serves as both frontend and backend — there's no separate API server.


- **Frontend**: React 19 + Tailwind v4 + shadcn/ui 
- **Backend**: Next.js Route Handlers under `app/api/**/route.ts`. Most routes are `POST` (create account, deposit, issue card, process transaction); `GET /api/accounts` reads everything back with accounts with their embedded card and transaction history in one Supabase query which is used to hydrate dashboard on load.
- **Database**: Supabase, accessed **only from Route Handlers**, never from the browser. `lib/supabase/server.ts` creates the Supabase client using the **service role key**, guarded by the `server-only` package so it can't accidentally leak into client-side JS.
- **No authentication layer.** A mock login screen was built early on, then deliberately removed to keep scope focused on the assignment's core HSA/transaction requirements. `/` redirects straight to `/dashboard`, and the app is open by design.
- **State management**: plain React `useState` at the `app/dashboard/page.tsx` level (`accounts`, `cards`, `transactions`), passed down via props and updated via callbacks. 

## Data Model

Three tables in Supabase/Postgres — the full schema (including both functions) lives in `supabase/schema.sql`.

- **`accounts`**: `id` (uuid, pk), `full_name`, `date_of_birth`, `balance` (numeric, default 0), `created_at`. Not linked to any user/owner — see Design Tradeoffs.
- **`cards`**: `id` (uuid, pk), `account_id` (uuid, **unique** FK → `accounts.id`), `card_number`, `status`, `issued_at`. The `unique` constraint on `account_id` is what enforces "zero or one card per account" — Postgres itself rejects a second insert for the same account, not application logic.
- **`transactions`**: `id` (uuid, pk), `account_id` (FK → `accounts.id`), `card_id` (nullable FK → `cards.id` — records which card, if any, was on file at transaction time), `merchant_category`, `amount`, `status` (`approved` | `declined`), `reason` (nullable, set for declines), `created_at`. This is an audit trail of every *attempted* transaction, not just approved ones — `status` and `reason` are always set explicitly by whichever function writes the row (`process_transaction` or `decline_transaction`), so every row states its own outcome and why.

## Request Flow

Every action follows the same shape: **Client Component → `fetch()` → Route Handler → Zod validation → Supabase → Postgres → mapped response → React state update.**

There are 3 RPC functions that user requests go through when depositing funds, sending transactions, and giving transaction statuses.

For a transaction, category is checked before balance: the route calls `isQualifiedExpense()` in plain JS first, with no database call at all and a Restaurant/Electronics charge is declined immediately via `decline_transaction`, regardless of balance. Only a qualified category ever reaches `process_transaction`, where the balance check happens. This ordering matters because for example, a $50 Restaurant charge against a $100 balance must decline for "Not a qualified medical expense," not "Insufficient funds."

- **`deposit_funds(account_id, amount)`**: `UPDATE accounts SET balance = balance + amount WHERE id = account_id RETURNING *`. Function allows to update balance directly from the server side data, I made this choice system logic wouldn't rely on stale balance from local app. 
- **`process_transaction(account_id, amount, category)`**: `UPDATE accounts SET balance = balance - amount WHERE id = account_id AND balance >= amount RETURNING *`, then always inserts an audit row into `transactions` — `status = 'approved'` if the update matched a row, or `status = 'declined', reason = 'Insufficient funds'` if it didn't. This function allows for concurrent transactions to be passed by locking one transaction and allowing one transaction to update balance directly to server side.
- **`decline_transaction(account_id, amount, category, reason)`**: a separate, lighter function for declines. Writes an audit row so every attempted transaction is approved or declined, for either reason is recorded why and displayed

## Concurrency Handling

The naive approach — `SELECT` balance in app code, compute the new value, `UPDATE` it back — has a race window: two concurrent requests can both read the same starting balance before either writes, and one silently overwrites the other (a "lost update").

`deposit_funds` and `process_transaction` avoid this with a single atomic `UPDATE`, run inside Postgres:

```sql
update accounts
set balance = balance - p_amount
where id = p_account_id and balance >= p_amount
```

The `WHERE balance >= p_amount` check happens as part of the same `UPDATE`, not a separate `SELECT` first. Postgres takes a **row lock** on the account for the duration — a second concurrent request against the same row physically waits for the first to commit, then re-checks its `WHERE` clause against the *just-updated* balance, not the stale value it started with.

Assignment's example, Balance $100 / A $80 / B $50, concurrent: whichever request commits first (say A) drops the balance to $20; the second (B) then re-checks `20 >= 50`, fails, updates zero rows, and gets recorded as `declined: Insufficient funds`. Order isn't guaranteed, but the outcome always is — exactly one succeeds, balance never goes negative.

Card issuance uses the same idea via a different mechanism: a `UNIQUE` constraint on `cards.account_id`. Two concurrent "issue card" requests for one account — Postgres rejects the second with a `23505` error, so the database enforces the invariant, not app code.

**Verified, not just trusted**: `tests/concurrent-transactions.test.ts` fires real concurrent requests at a running dev server + real Supabase, asserting the balance is *exactly* `starting − approvedAmount` — catching lost-update bugs a negative-balance check alone would miss.

## Design Tradeoffs / Known Limitations

1. **No authentication.** Deliberately scoped out to focus time on the core HSA/transaction/concurrency requirements.
2. **Accounts aren't linked to a user.** Accounts aren't linked to a user, more focused onto the core features of project scope. Adding an authentication layer such as username and password would be the next evolution.
3. **Service role key bypasses Row Level Security entirely.** Acceptable with no real auth in place; would need real RLS policies + the anon/publishable key once auth exists.
4. **Mock card numbers are stored in plaintext**, masked only at the UI layer which is acceptable given there is no real payment integration.
5. **State management is local `useState`, not a global store.** Appropriate at the current scope (one primary route, shallow prop-passing), but would need revisiting if the app grows more routes that need the same data.
6. **Qualified-expense categories are a hardcoded allowlist** (`Pharmacy`, `Hospital`) in `lib/qualified-expense.ts`, not configurable or database-driven. Real world applications would have some sort of classification engine for each individual product for HSA cards.
7. **No account deletion.** There's no way to remove an HSA account from the UI or API. A real implementation would need this to cascade correctly to its cards and transactions in Supabase.
8. **No real payment network integration.** Virtual cards are simulated. They exist for display and for linking transaction history, not connected to any real card network or payment processor.
9. **One card per account, hard-limited.** Real HSA platforms typically support multiple cards per account for different relationships (cardholder, spouse, dependent). This app enforces a strict 0-or-1 limit via the database's unique constraint.
10. **UI is functional, not consumer-polished.** Prioritized correctness and technical clarity (visible statuses, a dedicated concurrency-test dialog) over a refined visual design.