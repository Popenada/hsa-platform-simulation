# AI Usage

## Tools I Used

Claude Code (Claude Sonnet 5), used interactively inside the VS Code extension extensively throughout the build.

## Which Parts of the Project AI Helped With

- Understanding what information an HSA account actually needs to model
- Scaffolding: shadcn/ui integration
- Backend: API routes and Zod validation schema boilerplate
- Database design: the Postgres schema and the two atomic functions (`deposit_funds`, `process_transaction`) that enforce the concurrency guarantee
- Explaining new concepts along the way — for example, why RPC functions with an `UPDATE ... WHERE balance >= amount` guard are safe under concurrent requests, when a plain read-then-write in application code would not be

## Representative Prompts/Workflows

1. "Start building the route to Supabase API and validate the request schema before going to server side"
2. "Build a concurrent transactions simulator button that fires two concurrent transactions to Supabase using HTTP requests"
3. "Build a virtual credit card issued to an HSA account limited to one or 0"

## One Example Where AI Output Was Wrong, Incomplete, or Unhelpful

When I wanted to verify the correctness of concurrent transaction handling, the AI defaulted to testing it itself with local `curl` commands. I stepped in and had it build an actual concurrent-transactions button in the UI instead, so a reviewer could see the constraint hold for themselves rather than trusting an AI-run test they can't see. For deeper verification, I also had it build a Vitest integration test suite that fires real concurrent HTTP requests at the dev server to prove the $80 + $50 against a $100 balance scenario resolves correctly every time.

## How I Validated the Final Implementation

I used Vitest integration tests that fire concurrent requests against a real running dev server (not mocked) to confirm the balance-safety guarantee. I also manually walked through each UI flow in the browser after every feature was implemented, to confirm it behaved as intended and stayed within the project's scope. 