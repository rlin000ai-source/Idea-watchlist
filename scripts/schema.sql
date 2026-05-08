-- Watchlist schema for Supabase. Run once in the SQL editor.

create table if not exists watchlist_entries (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  exchange text not null,
  currency text not null,
  analysis_date date not null,
  anchor_price numeric not null,
  bull_target numeric not null,
  base_target numeric not null,
  bear_target numeric not null,
  thesis_oneliner text not null,
  catalysts jsonb not null,
  source_url text,
  tags jsonb,
  closed_date date,
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ticker, exchange),
  constraint price_targets_ordered
    check (bear_target < base_target and base_target < bull_target),
  constraint anchor_price_positive check (anchor_price > 0)
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists watchlist_entries_updated_at on watchlist_entries;
create trigger watchlist_entries_updated_at
before update on watchlist_entries
for each row execute function set_updated_at();

-- RLS is left disabled. All access goes through the Next.js API,
-- which uses the service-role key and gates on WATCHLIST_TOKEN.
alter table watchlist_entries disable row level security;
