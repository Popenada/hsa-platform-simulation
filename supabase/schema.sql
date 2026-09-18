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

-- Transactions: an audit trail of every attempted transaction, both
-- approved and declined, with a reason recorded for declines. Status
-- and reason are always set explicitly by the functions below —
-- there is no default, so every row states its own outcome.
create table transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  card_id uuid references cards(id),
  merchant_category text not null,
  amount numeric(12,2) not null,
  status text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- Atomically checks + deducts balance and records the transaction in
-- one function, so the check and the deduction can't be split across
-- a race window. Records an audit row either way: 'approved' if the
-- balance covered it, 'declined' (reason 'Insufficient funds') if not.
create or replace function process_transaction(
  p_account_id uuid,
  p_amount numeric,
  p_merchant_category text
)
returns table (
  txn_id uuid,
  txn_status text,
  txn_reason text,
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
  current_account accounts;
  new_txn_id uuid;
  matched_card_id uuid;
begin
  select id into matched_card_id from cards where account_id = p_account_id;

  update accounts
  set balance = balance - p_amount
  where id = p_account_id and balance >= p_amount
  returning * into updated;

  if found then
    insert into transactions (account_id, merchant_category, amount, card_id, status, reason)
    values (p_account_id, p_merchant_category, p_amount, matched_card_id, 'approved', null)
    returning id into new_txn_id;

    return query
      select new_txn_id, 'approved'::text, null::text, updated.id, updated.full_name,
             updated.date_of_birth, updated.balance, updated.created_at, matched_card_id;
  else
    select * into current_account from accounts where id = p_account_id;

    if not found then
      return; -- account genuinely doesn't exist
    end if;

    insert into transactions (account_id, merchant_category, amount, card_id, status, reason)
    values (p_account_id, p_merchant_category, p_amount, matched_card_id, 'declined', 'Insufficient funds')
    returning id into new_txn_id;

    return query
      select new_txn_id, 'declined'::text, 'Insufficient funds'::text, current_account.id,
             current_account.full_name, current_account.date_of_birth, current_account.balance,
             current_account.created_at, matched_card_id;
  end if;
end;
$$;

-- Records a declined transaction that never touched the balance at
-- all (failed the qualified-expense check before reaching Postgres).
-- Kept separate from process_transaction since it needs no balance
-- guard — it's a plain audit insert, not a balance-affecting update.
create or replace function decline_transaction(
  p_account_id uuid,
  p_amount numeric,
  p_merchant_category text,
  p_reason text
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
  current_account accounts;
  new_txn_id uuid;
  matched_card_id uuid;
begin
  select * into current_account from accounts where id = p_account_id;

  if not found then
    return;
  end if;

  select id into matched_card_id from cards where account_id = p_account_id;

  insert into transactions (account_id, merchant_category, amount, card_id, status, reason)
  values (p_account_id, p_merchant_category, p_amount, matched_card_id, 'declined', p_reason)
  returning id into new_txn_id;

  return query
    select new_txn_id, current_account.id, current_account.full_name, current_account.date_of_birth,
           current_account.balance, current_account.created_at, matched_card_id;
end;
$$;
