import { describe, it, expect, beforeAll } from "vitest";

// This is an integration test: it fires real HTTP requests at your actual
// running dev server (`npm run dev`), which calls the real Supabase project.
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function createTestAccount() {
  const res = await fetch(`${BASE_URL}/api/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Concurrency Test",
      dateOfBirth: "1990-01-01",
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to create test account (${res.status}) — is 'npm run dev' running at ${BASE_URL}?`
    );
  }
  return res.json();
}

async function deposit(accountId: string, amount: number) {
  const res = await fetch(`${BASE_URL}/api/accounts/${accountId}/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) {
    throw new Error(`Failed to deposit (${res.status})`);
  }
  return res.json();
}

async function simulateTransaction(
  accountId: string,
  amount: number,
  merchantCategory: string = "Pharmacy"
) {
  const res = await fetch(`${BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountId,
      merchantCategory,
      amount,
    }),
  });
  return res.json();
}

describe("concurrent transactions", () => {
  let accountId: string;

  beforeAll(async () => {
    const account = await createTestAccount();
    accountId = account.id;
    await deposit(accountId, 100);
  });

  it("approves exactly one of two transactions that together exceed the balance", async () => {
    // Simiulatting concurrent transactions with $80 and $50 dollar amounts
    // Behavior test to decline one transaction when two transactions can't exceed total account balance
    const [resultA, resultB] = await Promise.all([
      simulateTransaction(accountId, 80),
      simulateTransaction(accountId, 50),
    ]);

    const results = [resultA, resultB];
    const approved = results.filter((r) => r.status === "approved");
    const declined = results.filter((r) => r.status === "declined");

    expect(approved).toHaveLength(1);
    expect(declined).toHaveLength(1);
    expect(declined[0].reason).toBe("Insufficient funds");

    // The balance must never go negative, and must reflect exactly the
    // one approved deduction.
    const approvedAmount = approved[0].transaction.amount;
    expect(approved[0].account.balance).toBeGreaterThanOrEqual(0);
    expect(approved[0].account.balance).toBe(100 - approvedAmount);
  });

  it("declines a transaction for a non-qualified merchant category", async () => {
    const result = await simulateTransaction(accountId, 1, "Restaurant");

    expect(result.status).toBe("declined");
    expect(result.reason).toBe("Not a qualified medical expense");
  });
});
