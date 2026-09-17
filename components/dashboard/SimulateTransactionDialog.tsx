"use client";

import { useState } from "react";
import {
  createTransactionSchema,
  merchantCategorySchema,
} from "@/lib/schemas/transaction";
import { HsaAccount } from "@/lib/mock-accounts";
import { Transaction, MerchantCategory } from "@/lib/mock-transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Result = {
  status: "approved" | "declined";
  reason?: string;
};

export default function SimulateTransactionDialog({
  account,
  onSimulate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [merchantCategory, setMerchantCategory] = useState<
    MerchantCategory | ""
  >("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = createTransactionSchema.safeParse({
      accountId: account.id,
      merchantCategory,
      amount,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      setResult(null);
      return;
    }

    setErrors({});
    setResult(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setErrors({ form: body?.error ?? "Failed to process transaction" });
        return;
      }

      setResult({ status: body.status, reason: body.reason });
      if (body.status === "approved") {
        onSimulate(body.transaction, body.account);
      }
    } catch {
      setErrors({ form: "Failed to process transaction" });
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setMerchantCategory("");
      setAmount("");
      setErrors({});
      setResult(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline">Simulate Transaction</Button>} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Simulate Transaction — {account.fullName}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="merchantCategory">Merchant category</Label>
              <Select
                value={merchantCategory}
                onValueChange={(value) =>
                  setMerchantCategory(value as MerchantCategory)
                }
              >
                <SelectTrigger id="merchantCategory" className="w-full">
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
              {errors.merchantCategory && (
                <p className="text-sm text-destructive">
                  {errors.merchantCategory}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount}</p>
              )}
            </div>

            {errors.form && (
              <p className="text-sm text-destructive">{errors.form}</p>
            )}

            {result && (
              <p
                className={
                  result.status === "approved"
                    ? "text-sm font-medium text-foreground"
                    : "text-sm font-medium text-destructive"
                }
              >
                {result.status === "approved"
                  ? "Approved"
                  : `Declined${result.reason ? `: ${result.reason}` : ""}`}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Processing..." : "Submit Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
