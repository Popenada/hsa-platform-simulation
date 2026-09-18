"use client";

import { useEffect, useMemo, useState } from "react";
import { HsaAccount } from "@/lib/types/account";
import { HsaCard } from "@/lib/types/card";
import { Transaction } from "@/lib/types/transaction";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AccountsList from "@/components/dashboard/AccountsList";
import RecentTransactions from "@/components/dashboard/RecentTransactions";

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<HsaAccount[]>([]);
  const [cards, setCards] = useState<Record<string, HsaCard>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.accounts ?? []);
        setCards(data.cards ?? {});
        setTransactions(data.transactions ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const moneyLeftToSpend = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balance, 0),
    [accounts]
  );

  function handleAddAccount(account: HsaAccount) {
    setAccounts((prev) => [...prev, account]);
  }
  // Adding deposit amount by replacing account with updated balance
  function handleDeposit(updated: HsaAccount) {
    setAccounts((prev) =>
      prev.map((account) => (account.id === updated.id ? updated : account))
    );
  }

  function handleIssueCard(card: HsaCard) {
    setCards((prev) => ({ ...prev, [card.accountId]: card }));
  }

  function handleSimulateTransaction(
    transaction: Transaction,
    updatedAccount: HsaAccount
  ) {
    setTransactions((prev) => [transaction, ...prev]);
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === updatedAccount.id ? updatedAccount : account
      )
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-6 dark:bg-black">
      <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>

      <Card>
        <CardHeader className="items-center text-center">
          <CardTitle>Available Balance</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <p className="text-5xl font-bold text-foreground">
            ${moneyLeftToSpend.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <AccountsList
            accounts={accounts}
            cards={cards}
            onAddAccount={handleAddAccount}
            onDeposit={handleDeposit}
            onIssueCard={handleIssueCard}
            onSimulateTransaction={handleSimulateTransaction}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <RecentTransactions
            transactions={transactions}
            accounts={accounts}
            cards={cards}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
