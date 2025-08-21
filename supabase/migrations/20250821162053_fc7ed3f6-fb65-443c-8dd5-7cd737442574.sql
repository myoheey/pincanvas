-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create user profiles table
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  
  primary key (id)
);

-- Create canvases table
create table public.canvases (
  id uuid not null default gen_random_uuid() primary key,
  title text not null,
  image_url text,
  owner_id uuid not null references auth.users on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create layers table
create table public.layers (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  color text not null,
  visible boolean not null default true,
  canvas_id uuid not null references public.canvases on delete cascade,
  created_at timestamp with time zone not null default now()
);

-- Create pins table  
create table public.pins (
  id uuid not null default gen_random_uuid() primary key,
  x float not null,
  y float not null,
  title text not null,
  description text,
  layer_id uuid not null references public.layers on delete cascade,
  canvas_id uuid not null references public.canvases on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create media_items table
create table public.media_items (
  id uuid not null default gen_random_uuid() primary key,
  pin_id uuid not null references public.pins on delete cascade,
  type text not null check (type in ('image', 'video', 'url')),
  url text not null,
  name text,
  created_at timestamp with time zone not null default now()
);

-- Create canvas_shares table for sharing functionality
create table public.canvas_shares (
  id uuid not null default gen_random_uuid() primary key,
  canvas_id uuid not null references public.canvases on delete cascade,
  shared_with_email text not null,
  permission text not null check (permission in ('viewer', 'editor')),
  shared_by uuid not null references auth.users on delete cascade,
  created_at timestamp with time zone not null default now(),
  
  unique(canvas_id, shared_with_email)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.canvases enable row level security;
alter table public.layers enable row level security;
alter table public.pins enable row level security;
alter table public.media_items enable row level security;
alter table public.canvas_shares enable row level security;

-- Profiles policies
create policy "Users can view their own profile" 
on public.profiles 
for select 
using (auth.uid() = id);

create policy "Users can update their own profile" 
on public.profiles 
for update 
using (auth.uid() = id);

create policy "Users can insert their own profile" 
on public.profiles 
for insert 
with check (auth.uid() = id);

-- Canvases policies
create policy "Users can view their own canvases and shared canvases" 
on public.canvases 
for select 
using (
  auth.uid() = owner_id 
  or exists (
    select 1 from public.canvas_shares 
    where canvas_id = canvases.id 
    and shared_with_email = (select email from auth.users where id = auth.uid())
  )
);

create policy "Users can create their own canvases" 
on public.canvases 
for insert 
with check (auth.uid() = owner_id);

create policy "Users can update their own canvases or shared canvases with editor permission" 
on public.canvases 
for update 
using (
  auth.uid() = owner_id 
  or exists (
    select 1 from public.canvas_shares 
    where canvas_id = canvases.id 
    and shared_with_email = (select email from auth.users where id = auth.uid())
    and permission = 'editor'
  )
);

create policy "Users can delete their own canvases" 
on public.canvases 
for delete 
using (auth.uid() = owner_id);

-- Layers policies
create policy "Users can view layers of accessible canvases" 
on public.layers 
for select 
using (
  exists (
    select 1 from public.canvases 
    where id = layers.canvas_id 
    and (
      owner_id = auth.uid() 
      or exists (
        select 1 from public.canvas_shares 
        where canvas_id = canvases.id 
        and shared_with_email = (select email from auth.users where id = auth.uid())
      )
    )
  )
);

create policy "Users can modify layers of canvases they own or have editor access" 
on public.layers 
for all 
using (
  exists (
    select 1 from public.canvases 
    where id = layers.canvas_id 
    and (
      owner_id = auth.uid() 
      or exists (
        select 1 from public.canvas_shares 
        where canvas_id = canvases.id 
        and shared_with_email = (select email from auth.users where id = auth.uid())
        and permission = 'editor'
      )
    )
  )
);

-- Pins policies
create policy "Users can view pins of accessible canvases" 
on public.pins 
for select 
using (
  exists (
    select 1 from public.canvases 
    where id = pins.canvas_id 
    and (
      owner_id = auth.uid() 
      or exists (
        select 1 from public.canvas_shares 
        where canvas_id = canvases.id 
        and shared_with_email = (select email from auth.users where id = auth.uid())
      )
    )
  )
);

create policy "Users can modify pins of canvases they own or have editor access" 
on public.pins 
for all 
using (
  exists (
    select 1 from public.canvases 
    where id = pins.canvas_id 
    and (
      owner_id = auth.uid() 
      or exists (
        select 1 from public.canvas_shares 
        where canvas_id = canvases.id 
        and shared_with_email = (select email from auth.users where id = auth.uid())
        and permission = 'editor'
      )
    )
  )
);

-- Media items policies
create policy "Users can view media items of accessible pins" 
on public.media_items 
for select 
using (
  exists (
    select 1 from public.pins 
    join public.canvases on canvases.id = pins.canvas_id
    where pins.id = media_items.pin_id 
    and (
      canvases.owner_id = auth.uid() 
      or exists (
        select 1 from public.canvas_shares 
        where canvas_id = canvases.id 
        and shared_with_email = (select email from auth.users where id = auth.uid())
      )
    )
  )
);

create policy "Users can modify media items of pins they have editor access to" 
on public.media_items 
for all 
using (
  exists (
    select 1 from public.pins 
    join public.canvases on canvases.id = pins.canvas_id
    where pins.id = media_items.pin_id 
    and (
      canvases.owner_id = auth.uid() 
      or exists (
        select 1 from public.canvas_shares 
        where canvas_id = canvases.id 
        and shared_with_email = (select email from auth.users where id = auth.uid())
        and permission = 'editor'
      )
    )
  )
);

-- Canvas shares policies
create policy "Users can view shares of their own canvases" 
on public.canvas_shares 
for select 
using (
  exists (
    select 1 from public.canvases 
    where id = canvas_shares.canvas_id 
    and owner_id = auth.uid()
  )
);

create policy "Users can create shares for their own canvases" 
on public.canvas_shares 
for insert 
with check (
  exists (
    select 1 from public.canvases 
    where id = canvas_shares.canvas_id 
    and owner_id = auth.uid()
  )
);

create policy "Users can delete shares of their own canvases" 
on public.canvas_shares 
for delete 
using (
  exists (
    select 1 from public.canvases 
    where id = canvas_shares.canvas_id 
    and owner_id = auth.uid()
  )
);

-- Create function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to update timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at timestamps
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_canvases_updated_at
  before update on public.canvases
  for each row execute function public.update_updated_at_column();

create trigger update_pins_updated_at
  before update on public.pins
  for each row execute function public.update_updated_at_column();