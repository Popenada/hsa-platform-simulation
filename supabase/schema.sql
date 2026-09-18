-- Run this once against a fresh Supabase project (SQL Editor)

-- Accounts: one row per HSA account. Not yet linked to a user/owner
create table accounts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  date_of_birth date not null,
  balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Atomically increments an account's balance. Used by the deposit
-- endpoint. The increment happens inside a single UPDATE statement,
-- so it's safe under concurrent deposits (no read-then-write race).
create or replace function deposit_funds(p_account_id uuid, p_amount numeric)
returns accounts
language plpgsql
as $$
declare
  updated_account accounts;
begin
  if p_amount <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  update accounts
  set balance = balance + p_amount
  where id = p_account_id
  returning * into updated_account;

  if not found then
    raise exception 'Account not found';
  end if;

  return updated_account;
end;
$$;

-- Cards: at most one card per account, enforced by the UNIQUE
-- constraint on account_id — the database itself rejects a second
-- card, not just application code.
create table cards (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references accounts(id) on delete cascade,
  card_number text not null,
  status text not null default 'active',
  issued_at timestamptz not null default now()
);

-- Transactions: one row per *approved* transaction only. Declined
-- transactions (failed qualified-expense check or insufficient
-- funds) are never persisted here.
create table transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  card_id uuid references cards(id),
  merchant_category text not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- Atomically checks + deducts balance and records the transaction in
-- one function, so the check and the deduction can't be split across a race window
create or replace function process_transaction(
  p_account_id uuid,
  p_amount numeric,
  p_merchant_category text
)
returns table (
  txn_id uuid,
  acct_id uuid,
  acct_full_name text,
  acct_date_of_birth date,
  acct_balance numeric,
  acct_created_at timestamptz,
  txn_card_id uuid
)
language plpgsql
as $$
declare
  updated accounts;
  new_txn_id uuid;
  matched_card_id uuid;
begin
  update accounts
  set balance = balance - p_amount
  where id = p_account_id and balance >= p_amount
  returning * into updated;

  if not found then
    return; 
  end if;

  select id into matched_card_id from cards where account_id = p_account_id;

  insert into transactions (account_id, merchant_category, amount, card_id)
  values (p_account_id, p_merchant_category, p_amount, matched_card_id)
  returning id into new_txn_id;

  return query
    select new_txn_id, updated.id, updated.full_name, updated.date_of_birth,
           updated.balance, updated.created_at, matched_card_id;
end;
$$;
