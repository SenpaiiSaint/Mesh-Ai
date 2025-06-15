-- Create contracts table
create table if not exists contracts (
  id uuid primary key,
  file_name text not null,
  storage_path text not null,
  ocr_text text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table contracts enable row level security;

-- Create policy to allow all operations
create policy "allow all" on contracts for all using (true); 