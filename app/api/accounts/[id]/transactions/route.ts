import { NextResponse } from "next/server";
import { createTransactionSchema } from "@/lib/schemas/transaction";
import { isQualifiedExpense } from "@/lib/qualified-expense";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AccountRow = {
  txn_id: string;
  acct_id: string;
  acct_full_name: string;
  acct_date_of_birth: string;
  acct_balance: number;
  acct_created_at: string;
  txn_card_id: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = createTransactionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { merchantCategory, amount } = result.data;
  const supabase = createServerSupabaseClient();

  // Not a qualified expense: record the declined attempt for the audit
  // trail, but never touch the balance.
  if (!isQualifiedExpense(merchantCategory)) {
    const reason = "Not a qualified medical expense";
    const { data, error } = await supabase
      .rpc("decline_transaction", {
        p_account_id: id,
        p_amount: amount,
        p_merchant_category: merchantCategory,
        p_reason: reason,
      })
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data as AccountRow;
    return NextResponse.json({
      status: "declined",
      reason,
      transaction: {
        id: row.txn_id,
        accountId: row.acct_id,
        cardId: row.txn_card_id,
        merchantCategory,
        amount,
        status: "declined",
        reason,
      },
      account: {
        id: row.acct_id,
        fullName: row.acct_full_name,
        dateOfBirth: row.acct_date_of_birth,
        balance: row.acct_balance,
        createdAt: row.acct_created_at,
      },
    });
  }

  // Qualified expense: atomically check + deduct the balance (or record a
  // declined "Insufficient funds" attempt if it doesn't fit).
  const { data, error } = await supabase
    .rpc("process_transaction", {
      p_account_id: id,
      p_amount: amount,
      p_merchant_category: merchantCategory,
    })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as AccountRow & { txn_status: "approved" | "declined"; txn_reason: string | null };

  return NextResponse.json({
    status: row.txn_status,
    reason: row.txn_reason,
    transaction: {
      id: row.txn_id,
      accountId: row.acct_id,
      cardId: row.txn_card_id,
      merchantCategory,
      amount,
      status: row.txn_status,
      reason: row.txn_reason,
    },
    account: {
      id: row.acct_id,
      fullName: row.acct_full_name,
      dateOfBirth: row.acct_date_of_birth,
      balance: row.acct_balance,
      createdAt: row.acct_created_at,
    },
  });
}
