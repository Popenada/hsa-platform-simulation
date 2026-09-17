import { NextResponse } from "next/server";
import { createTransactionSchema } from "@/lib/schemas/transaction";
import { isQualifiedExpense } from "@/lib/qualified-expense";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const result = createTransactionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { accountId, merchantCategory, amount } = result.data;

  if (!isQualifiedExpense(merchantCategory)) {
    return NextResponse.json({
      status: "declined",
      reason: "Not a qualified medical expense",
    });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("process_transaction", {
      p_account_id: accountId,
      p_amount: amount,
      p_merchant_category: merchantCategory,
    })
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({
        status: "declined",
        reason: "Insufficient funds",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as {
    txn_id: string;
    acct_id: string;
    acct_full_name: string;
    acct_date_of_birth: string;
    acct_balance: number;
    acct_created_at: string;
  };

  return NextResponse.json({
    status: "approved",
    transaction: {
      id: row.txn_id,
      accountId: row.acct_id,
      merchantCategory,
      amount,
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
