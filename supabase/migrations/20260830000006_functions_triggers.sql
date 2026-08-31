-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.student_profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.extracurriculars
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.universities
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.university_programs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.chat_conversations
  for each row execute function public.set_updated_at();

-- Mirror new Supabase Auth users into public.users so the rest of the schema
-- (which FKs to public.users, not auth.users) has a row to join against.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
