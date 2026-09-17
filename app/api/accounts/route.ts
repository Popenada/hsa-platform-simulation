import { NextResponse } from "next/server";
import { createHsaAccountSchema } from "@/lib/schemas/hsa-account";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const { data, error } = await supabase
    .from("accounts")
    .insert({ full_name: fullName, date_of_birth: dateOfBirth, balance: 0 })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
