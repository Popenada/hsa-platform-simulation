# AI Usage

## Tools I Used

Claude Code (Claude Sonnet 5), used interactively inside the VS Code extension extensively throughout the build.

## Which Parts of the Project AI Helped With

- Understanding what information an HSA account actually needs to model
- Scaffolding: shadcn/ui integration
- Backend: API routes and Zod validation schema boilerplate
- Database design: the Postgres schema and the two atomic functions (`deposit_funds`, `process_transaction`) that enforce the concurrency guarantee
- Explaining new concepts along the way. For example, why RPC functions with an `UPDATE ... WHERE balance >= amount` guard are safe under concurrent requests, when a plain read-then-write in application code would not be

## Representative Prompts/Workflows

1. "Write a Postgres function that atomically debits a balance only if sufficient funds exist, to prevent a race condition between concurrent requests"
2. "Build a concurrent transactions simulator button that fires two concurrent transactions to Supabase using HTTP requests"
3. "Build and wire a virtual credit card issued to an HSA account limited to one or 0"

## One Example Where AI Output Was Wrong, Incomplete, or Unhelpful

When I asked for state management for the dashboard, AI scaffolded a full React Context setup (a TransactionsContext provider, a useTransactions hook, and supporting files) to share account/card/transaction data across components. The app has one primary route with shallow prop-passing, not multiple unrelated components needing the same global state, and the data is server-backed (Supabase), not true client-only state a store pattern is meant for. I removed the Context files and used local useState at the dashboard page level instead, refetching after each mutation. The AI wasn't necessarily wrong but it was unhelpful because this would add another complexity layer which didn't match the scope of the project. 

## How I Validated the Final Implementation

I used Vitest integration tests that fire concurrent requests against a real running dev server (not mocked) to confirm the balance-safety guarantee. I also manually walked through each UI flow in the browser after every feature was implemented, to confirm it behaved as intended and stayed within the project's scope. 