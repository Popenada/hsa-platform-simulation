"use client";

import { HsaAccount } from "@/lib/types/account";
import { HsaCard } from "@/lib/types/card";
import { Transaction } from "@/lib/types/transaction";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AddAccountDialog from "@/components/dashboard/AddAccountDialog";
import DepositDialog from "@/components/dashboard/DepositDialog";
import CardStatus from "@/components/dashboard/CardStatus";
import SimulateTransactionDialog from "@/components/dashboard/SimulateTransactionDialog";
import ConcurrencyTestDialog from "@/components/dashboard/ConcurrencyTestDialog";

type Props = {
  accounts: HsaAccount[];
  cards: Record<string, HsaCard>;
  onAddAccount: (account: HsaAccount) => void;
  onDeposit: (account: HsaAccount) => void;
  onIssueCard: (card: HsaCard) => void;
  onSimulateTransaction: (transaction: Transaction, account: HsaAccount) => void;
};

export default function AccountsList({
  accounts,
  cards,
  onAddAccount,
  onDeposit,
  onIssueCard,
  onSimulateTransaction,
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
              <CardStatus
                accountId={account.id}
                card={cards[account.id]}
                onIssue={onIssueCard}
              />
              <SimulateTransactionDialog
                account={account}
                onSimulate={onSimulateTransaction}
              />
              <ConcurrencyTestDialog
                account={account}
                onSimulate={onSimulateTransaction}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
