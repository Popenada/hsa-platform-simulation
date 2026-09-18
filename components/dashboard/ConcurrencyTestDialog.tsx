"use client";

import { useState } from "react";
import {
  createTransactionSchema,
  merchantCategorySchema,
} from "@/lib/schemas/transaction";
import { HsaAccount } from "@/lib/types/account";
import { Transaction, MerchantCategory } from "@/lib/types/transaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

const CATEGORIES = merchantCategorySchema.options;

type Props = {
  account: HsaAccount;
  onSimulate: (transaction: Transaction, account: HsaAccount) => void;
};

type TxnInput = {
  merchantCategory: MerchantCategory | "";
  amount: string;
};

type RaceResult = {
  status: "approved" | "declined" | "error";
  reason?: string;
};

const emptyTxn: TxnInput = { merchantCategory: "", amount: "" };

export default function ConcurrencyTestDialog({ account, onSimulate }: Props) {
  const [open, setOpen] = useState(false);
  const [txnA, setTxnA] = useState<TxnInput>(emptyTxn);
  const [txnB, setTxnB] = useState<TxnInput>(emptyTxn);
  const [errors, setErrors] = useState<{ a?: string; b?: string; form?: string }>(
    {}
  );
  const [results, setResults] = useState<[RaceResult, RaceResult] | null>(null);
  const [running, setRunning] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsedA = createTransactionSchema.safeParse({
      accountId: account.id,
      merchantCategory: txnA.merchantCategory,
      amount: txnA.amount,
    });
    const parsedB = createTransactionSchema.safeParse({
      accountId: account.id,
      merchantCategory: txnB.merchantCategory,
      amount: txnB.amount,
    });

    const nextErrors: { a?: string; b?: string } = {};
    if (!parsedA.success) nextErrors.a = parsedA.error.issues[0].message;
    if (!parsedB.success) nextErrors.b = parsedB.error.issues[0].message;

    if (nextErrors.a || nextErrors.b) {
      setErrors(nextErrors);
      setResults(null);
      return;
    }

    setErrors({});
    setResults(null);
    setRunning(true);

    try {
      const [resA, resB] = await Promise.all([
        fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedA.data),
        }),
        fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedB.data),
        }),
      ]);

      const [bodyA, bodyB] = await Promise.all([
        resA.json().catch(() => null),
        resB.json().catch(() => null),
      ]);

      for (const result of [bodyA, bodyB]) {
        if (result?.transaction && result?.account) {
          onSimulate(result.transaction, result.account);
        }
      }

      setResults([
        { status: bodyA?.status ?? "error", reason: bodyA?.reason ?? bodyA?.error },
        { status: bodyB?.status ?? "error", reason: bodyB?.reason ?? bodyB?.error },
      ]);
    } catch {
      setErrors({ form: "Failed to run concurrent transactions" });
    } finally {
      setRunning(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTxnA(emptyTxn);
      setTxnB(emptyTxn);
      setErrors({});
      setResults(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant="secondary">Test Concurrent Transactions</Button>}
      />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Test Concurrent Transactions — {account.fullName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2 rounded-md border border-input p-3">
              <p className="text-sm font-medium text-foreground">
                Transaction A
              </p>
              <Select
                value={txnA.merchantCategory}
                onValueChange={(value) =>
                  setTxnA((prev) => ({
                    ...prev,
                    merchantCategory: value as MerchantCategory,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                value={txnA.amount}
                onChange={(e) =>
                  setTxnA((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
              {errors.a && <p className="text-sm text-destructive">{errors.a}</p>}
            </div>

            <div className="flex flex-col gap-2 rounded-md border border-input p-3">
              <p className="text-sm font-medium text-foreground">
                Transaction B
              </p>
              <Select
                value={txnB.merchantCategory}
                onValueChange={(value) =>
                  setTxnB((prev) => ({
                    ...prev,
                    merchantCategory: value as MerchantCategory,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                value={txnB.amount}
                onChange={(e) =>
                  setTxnB((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
              {errors.b && <p className="text-sm text-destructive">{errors.b}</p>}
            </div>

            {errors.form && (
              <p className="text-sm text-destructive">{errors.form}</p>
            )}

            {results && (
              <div className="flex flex-col gap-1 text-sm">
                <p
                  className={
                    results[0].status === "approved"
                      ? "text-foreground"
                      : "text-destructive"
                  }
                >
                  Request A: {results[0].status}
                  {results[0].reason ? ` (${results[0].reason})` : ""}
                </p>
                <p
                  className={
                    results[1].status === "approved"
                      ? "text-foreground"
                      : "text-destructive"
                  }
                >
                  Request B: {results[1].status}
                  {results[1].reason ? ` (${results[1].reason})` : ""}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={running}>
              {running ? "Running..." : "Fire Both Transactions"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
