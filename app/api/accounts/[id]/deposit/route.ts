import { NextResponse } from "next/server";
import { depositSchema } from "@/lib/schemas/deposit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = depositSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: result.error.issues },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("deposit_funds", { p_account_id: id, p_amount: result.data.amount })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const account = data as {
    id: string;
    full_name: string;
    date_of_birth: string;
    balance: number;
    created_at: string;
  };

  return NextResponse.json({
    id: account.id,
    fullName: account.full_name,
    dateOfBirth: account.date_of_birth,
    balance: account.balance,
    createdAt: account.created_at,
  });
}
