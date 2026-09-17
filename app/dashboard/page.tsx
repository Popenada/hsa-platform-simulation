"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HsaAccount, mockAccounts } from "@/lib/mock-accounts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AccountsList from "@/components/dashboard/AccountsList";
import RecentTransactions from "@/components/dashboard/RecentTransactions";

export default function DashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<HsaAccount[]>(mockAccounts);

  useEffect(() => {
    const user = localStorage.getItem("hsa_user");
    if (!user) {
      router.push("/login");
    } else {
      setUsername(user);
    }
  }, [router]);

  const moneyLeftToSpend = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balance, 0),
    [accounts]
  );

  function handleAddAccount(input: { fullName: string; dateOfBirth: string }) {
    const newAccount: HsaAccount = {
      id: `acc_${Date.now()}`,
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth,
      balance: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setAccounts((prev) => [...prev, newAccount]);
  }

  if (!username) return null;

  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-6 dark:bg-black">
      <h1 className="text-xl font-semibold text-foreground">
        Welcome, {username}
      </h1>

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
          <AccountsList accounts={accounts} onAddAccount={handleAddAccount} />
        </TabsContent>

        <TabsContent value="transactions">
          <RecentTransactions />
        </TabsContent>
      </Tabs>
    </div>
  );
}
