import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Generate random card last 4 digit number for display purposes only
function generateCardNumber() {
  const digits = Array.from({ length: 15 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
  return `4${digits}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("cards")
    .insert({
      account_id: id,
      card_number: generateCardNumber(),
      status: "active",
    })
    .select()
    .single();
  // Postgres rejection to account already having card 
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This account already has a card" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: data.id,
      accountId: data.account_id,
      cardNumber: data.card_number,
      status: data.status,
      issuedAt: data.issued_at,
    },
    { status: 201 }
  );
}
