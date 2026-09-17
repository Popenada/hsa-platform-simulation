"use client";

import { useState } from "react";
import { HsaCard } from "@/lib/mock-cards";
import { Button } from "@/components/ui/button";

type Props = {
  accountId: string;
  card: HsaCard | undefined;
  onIssue: (card: HsaCard) => void;
};

export default function CardStatus({ accountId, card, onIssue }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  async function handleIssue() {
    setError(null);
    setIssuing(true);

    try {
      const res = await fetch(`/api/accounts/${accountId}/card`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Failed to issue card");
        return;
      }

      const issued: HsaCard = await res.json();
      onIssue(issued);
    } catch {
      setError("Failed to issue card");
    } finally {
      setIssuing(false);
    }
  }

  if (card) {
    const last4 = card.cardNumber.slice(-4);
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
          <span className="font-mono">•••• •••• •••• {last4}</span>
          <span className="text-xs text-muted-foreground capitalize">
            {card.status}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleIssue}
          disabled={issuing}
        >
          {issuing ? "Testing..." : "Test: try issuing another card"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        onClick={handleIssue}
        disabled={issuing}
      >
        {issuing ? "Issuing..." : "Issue Card"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
