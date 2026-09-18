import { NextResponse } from "next/server";
import { createHsaAccountSchema } from "@/lib/schemas/hsa-account";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HsaAccount } from "@/lib/types/account";
import { HsaCard } from "@/lib/types/card";
import { Transaction, MerchantCategory } from "@/lib/types/transaction";

type AccountWithRelations = {
  id: string;
  full_name: string;
  date_of_birth: string;
  balance: number;
  created_at: string;
  cards: {
    id: string;
    account_id: string;
    card_number: string;
    status: string;
    issued_at: string;
  } | null;
  transactions: {
    id: string;
    account_id: string;
    card_id: string | null;
    merchant_category: string;
    amount: number;
    status: string;
    reason: string | null;
  }[];
};

export async function GET() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("accounts")
    .select(
      `
      id, full_name, date_of_birth, balance, created_at,
      cards ( id, account_id, card_number, status, issued_at ),
      transactions ( id, account_id, card_id, merchant_category, amount, status, reason )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data as unknown as AccountWithRelations[];

  const accounts: HsaAccount[] = rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    balance: row.balance,
    createdAt: row.created_at,
  }));

  const cards: Record<string, HsaCard> = {};
  for (const row of rows) {
    const card = row.cards;
    if (card) {
      cards[card.account_id] = {
        id: card.id,
        accountId: card.account_id,
        cardNumber: card.card_number,
        status: card.status as HsaCard["status"],
        issuedAt: card.issued_at,
      };
    }
  }

  const transactions: Transaction[] = rows.flatMap((row) =>
    row.transactions.map((txn) => ({
      id: txn.id,
      accountId: txn.account_id,
      cardId: txn.card_id,
      merchantCategory: txn.merchant_category as MerchantCategory,
      amount: txn.amount,
      status: txn.status as Transaction["status"],
      reason: txn.reason,
    }))
  );

  return NextResponse.json({ accounts, cards, transactions });
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = createHsaAccountSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { fullName, dateOfBirth } = result.data;
  const supabase = createServerSupabaseClient();
  // Insertion of Supabase data such as full name and date of birth into row table
  const { data, error } = await supabase
    .from("accounts")
    .insert({ full_name: fullName, date_of_birth: dateOfBirth, balance: 0 })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Mapping data objects to Supabase data rows
  return NextResponse.json(
    {
      id: data.id,
      fullName: data.full_name,
      dateOfBirth: data.date_of_birth,
      balance: data.balance,
      createdAt: data.created_at,
    },
    { status: 201 }
  );
}
