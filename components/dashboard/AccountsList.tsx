"use client";

import { HsaAccount } from "@/lib/mock-accounts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AddAccountDialog from "@/components/dashboard/AddAccountDialog";
import DepositDialog from "@/components/dashboard/DepositDialog";

type Props = {
  accounts: HsaAccount[];
  onAddAccount: (account: HsaAccount) => void;
  onDeposit: (account: HsaAccount) => void;
};

export default function AccountsList({
  accounts,
  onAddAccount,
  onDeposit,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Your HSA Accounts
        </h2>
        <AddAccountDialog onCreate={onAddAccount} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <CardTitle>{account.fullName}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-2xl font-semibold text-foreground">
                ${account.balance.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Opened {account.createdAt}
              </p>
              <DepositDialog account={account} onDeposit={onDeposit} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
