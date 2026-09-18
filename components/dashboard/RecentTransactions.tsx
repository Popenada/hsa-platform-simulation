"use client";

import { useMemo } from "react";
import { Transaction } from "@/lib/types/transaction";
import { HsaAccount } from "@/lib/types/account";
import { HsaCard } from "@/lib/types/card";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

type Props = {
  transactions: Transaction[];
  accounts: HsaAccount[];
  cards: Record<string, HsaCard>;
};

export default function RecentTransactions({
  transactions,
  accounts,
  cards,
}: Props) {
  const accountsById = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.id, account])),
    [accounts]
  );

  const cardsById = useMemo(
    () =>
      Object.fromEntries(Object.values(cards).map((card) => [card.id, card])),
    [cards]
  );

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No recent transactions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merchant Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Card</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const account = accountsById[transaction.accountId];
              const card = transaction.cardId
                ? cardsById[transaction.cardId]
                : undefined;

              return (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.merchantCategory}</TableCell>
                  <TableCell className="text-right">
                    ${transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>{account?.fullName ?? transaction.accountId}</TableCell>
                  <TableCell className="font-mono">
                    {card ? `•••• ${card.cardNumber.slice(-4)}` : "No card"}
                  </TableCell>
                  <TableCell
                    className={
                      transaction.status === "approved"
                        ? "text-foreground"
                        : "text-destructive"
                    }
                  >
                    {transaction.status}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {transaction.reason ?? "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
