-- Enable RLS
-- alter table auth.users enable row level security; -- Managed by Supabase internally

-- Profiles (User Data)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  username text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Tasks
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  notes text,
  due_date timestamptz,
  priority text check (priority in ('low', 'medium', 'high')),
  completed boolean default false,
  created_at timestamptz default now()
);
alter table public.tasks enable row level security;

drop policy if exists "Users can CRUD their own tasks" on public.tasks;
create policy "Users can CRUD their own tasks" on public.tasks
  for all using (auth.uid() = user_id);

-- Blocked Apps
create table if not exists public.blocked_apps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  url text not null,
  is_enabled boolean default true,
  block_mode text check (block_mode in ('always', 'focus')) default 'focus',
  icon text
);
alter table public.blocked_apps enable row level security;

drop policy if exists "Users can CRUD their own blocked apps" on public.blocked_apps;
create policy "Users can CRUD their own blocked apps" on public.blocked_apps
  for all using (auth.uid() = user_id);

-- Focus Sessions
create table if not exists public.focus_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  start_time timestamptz not null,
  duration_minutes int not null,
  completed boolean default false,
  apps_blocked_count int default 0,
  created_at timestamptz default now()
);
alter table public.focus_sessions enable row level security;

drop policy if exists "Users can CRUD their own focus sessions" on public.focus_sessions;
create policy "Users can CRUD their own focus sessions" on public.focus_sessions
  for all using (auth.uid() = user_id);

-- Triggers for Profile Creation on Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
