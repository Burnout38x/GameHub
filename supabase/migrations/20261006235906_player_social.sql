-- Private social graph and presence. Application authenticates every call before
-- invoking these service-only functions; no browser role can query the tables.
create table public.player_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index player_follows_received on public.player_follows(followed_id, follower_id);
create table public.player_presence (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  show_online boolean not null default false,
  last_seen_at timestamptz
);
create table public.room_invitations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (sender_id <> recipient_id)
);
create index room_invitations_inbox on public.room_invitations(recipient_id, created_at desc);
create index room_invitations_sender on public.room_invitations(sender_id, created_at desc);
alter table public.player_follows enable row level security;
alter table public.player_presence enable row level security;
alter table public.room_invitations enable row level security;
revoke all on public.player_follows, public.player_presence, public.room_invitations from public, anon, authenticated;
grant all on public.player_follows, public.player_presence, public.room_invitations to service_role;

create function public.player_social_action(actor_id uuid, action_name text, target_id uuid default null, target_room_code text default null, visible boolean default null, show_online boolean default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare inv public.room_invitations%rowtype; r public.rooms%rowtype; cap integer; result_id uuid;
begin
  -- Serializes per-player quotas and settings, including simultaneous requests.
  perform pg_advisory_xact_lock(hashtextextended('social:' || actor_id::text, 0));
  if not exists(select 1 from public.profiles where id=actor_id) then raise exception 'Player not found'; end if;
  if action_name = 'presence' then
    insert into public.player_presence(profile_id) values(actor_id) on conflict do nothing;
    update public.player_presence p set show_online=coalesce(player_social_action.show_online,p.show_online),
      last_seen_at=case when coalesce(player_social_action.show_online,p.show_online) and coalesce(visible,true) then now() else null end
      where profile_id=actor_id;
  elsif action_name = 'follow' then
    if target_id=actor_id or not exists(select 1 from public.profiles where id=target_id) then raise exception 'Player not found'; end if;
    if not exists(select 1 from public.player_follows where follower_id=actor_id and followed_id=target_id) then
      if (select count(*) from public.player_follows where follower_id=actor_id) >=100 then raise exception 'You can follow up to 100 players'; end if;
      insert into public.player_follows(follower_id,followed_id) values(actor_id,target_id);
    end if;
  elsif action_name = 'unfollow' then
    delete from public.player_follows where follower_id=actor_id and followed_id=target_id;
    -- Revoke queued invitations immediately in either direction.
    update public.room_invitations set status='declined' where status='pending' and
      ((sender_id=actor_id and recipient_id=target_id) or (sender_id=target_id and recipient_id=actor_id));
  elsif action_name = 'invite' then
    if not exists(select 1 from public.player_follows where follower_id=actor_id and followed_id=target_id)
      or not exists(select 1 from public.player_follows where follower_id=target_id and followed_id=actor_id) then raise exception 'Follow each other before sending invitations'; end if;
    select * into r from public.rooms where code=upper(target_room_code);
    if not found or r.status <> 'lobby' then raise exception 'This room is no longer accepting players'; end if;
    if not exists(select 1 from public.room_players where room_id=r.id and profile_id=actor_id) then raise exception 'Join the room before inviting friends'; end if;
    if exists(select 1 from public.room_players where room_id=r.id and profile_id=target_id) then raise exception 'Your friend is already in this room'; end if;
    select case when type='predict' then 2 else 10 end into cap from public.games where id=r.game_id;
    if (select count(*) from public.room_players where room_id=r.id)>=cap then raise exception 'This room is full'; end if;
    if exists(select 1 from public.room_invitations where sender_id=actor_id and recipient_id=target_id and room_id=r.id and status='pending' and expires_at>now()) then return jsonb_build_object('ok',true); end if;
    if (select count(*) from public.room_invitations where sender_id=actor_id and created_at>now()-interval '1 hour')>=20 then raise exception 'Invitation limit reached. Try again in an hour'; end if;
    if (select count(*) from public.room_invitations where sender_id=actor_id and recipient_id=target_id and created_at>now()-interval '1 hour')>=3 then raise exception 'Give your friend time to respond before inviting again'; end if;
    insert into public.room_invitations(sender_id,recipient_id,room_id) values(actor_id,target_id,r.id) returning id into result_id;
  elsif action_name in ('accept','decline') then
    select * into inv from public.room_invitations where id=target_id and recipient_id=actor_id for update;
    if not found then raise exception 'Invitation not found'; end if;
    if action_name='decline' then
      update public.room_invitations set status='declined' where id=inv.id and status='pending';
    else
      select * into r from public.rooms where id=inv.room_id for update;
      if inv.status='accepted' and exists(select 1 from public.room_players where room_id=r.id and profile_id=actor_id) then return jsonb_build_object('ok',true,'roomCode',r.code); end if;
      if inv.status<>'pending' or inv.expires_at<=now() then raise exception 'This invitation is no longer available'; end if;
      if not exists(select 1 from public.player_follows where follower_id=actor_id and followed_id=inv.sender_id)
        or not exists(select 1 from public.player_follows where follower_id=inv.sender_id and followed_id=actor_id) then raise exception 'Follow each other before accepting invitations'; end if;
      if r.status<>'lobby' then raise exception 'This room is no longer accepting players'; end if;
      if not exists(select 1 from public.room_players where room_id=r.id and profile_id=inv.sender_id) then raise exception 'Your friend has left this room'; end if;
      if not exists(select 1 from public.room_players where room_id=r.id and profile_id=actor_id) then
        select case when type='predict' then 2 else 10 end into cap from public.games where id=r.game_id;
        if (select count(*) from public.room_players where room_id=r.id)>=cap then raise exception 'This room is full'; end if;
        insert into public.room_players(room_id,profile_id,display_name) select r.id,actor_id,username from public.profiles where id=actor_id;
      end if;
      update public.room_invitations set status='accepted' where id=inv.id;
      return jsonb_build_object('ok',true,'roomCode',r.code);
    end if;
  else raise exception 'Unknown social action';
  end if;
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.player_social_action(uuid,text,uuid,text,boolean,boolean) from public, anon, authenticated;
grant execute on function public.player_social_action(uuid,text,uuid,text,boolean,boolean) to service_role;

create function public.player_social_dashboard(actor_id uuid, search_query text default '')
returns jsonb language sql stable security invoker set search_path='' as $$
with outgoing as (select followed_id id from public.player_follows where follower_id=actor_id),
incoming as (select follower_id id from public.player_follows where followed_id=actor_id),
search_ids as (select id from public.profiles where id<>actor_id and length(search_query) between 2 and 40 and strpos(lower(username),lower(search_query))>0 order by username,id limit 20),
people as (
 select p.id,p.username, exists(select 1 from outgoing where id=p.id) following,
 exists(select 1 from incoming where id=p.id) "followsYou",
 coalesce(s.show_online and s.last_seen_at > now()-interval '90 seconds'
   and exists(select 1 from outgoing where id=p.id) and exists(select 1 from incoming where id=p.id),false) online
 from public.profiles p left join public.player_presence s on s.profile_id=p.id
 where p.id in (select id from outgoing union select id from (select id from incoming order by id limit 100) i union select id from search_ids)
), invites as (
 select i.id,jsonb_build_object('id',p.id,'username',p.username) sender,r.code "roomCode",g.name "gameName",i.expires_at "expiresAt",
 (r.status='lobby' and exists(select 1 from public.room_players where room_id=r.id and profile_id=i.sender_id)
 and exists(select 1 from outgoing where id=i.sender_id) and exists(select 1 from incoming where id=i.sender_id)
 and (exists(select 1 from public.room_players where room_id=r.id and profile_id=actor_id)
 or (select count(*) from public.room_players where room_id=r.id)<case when g.type='predict' then 2 else 10 end)) available
 from public.room_invitations i join public.profiles p on p.id=i.sender_id join public.rooms r on r.id=i.room_id join public.games g on g.id=r.game_id
 where i.recipient_id=actor_id and i.status='pending' and i.expires_at>now() order by i.created_at desc limit 100
)
select jsonb_build_object(
 'following',coalesce((select jsonb_agg(to_jsonb(p) order by online desc,username,id) from people p where following),'[]'::jsonb),
 'followers',coalesce((select jsonb_agg(to_jsonb(p) order by online desc,username,id) from people p where "followsYou" and id in (select id from incoming order by id limit 100)),'[]'::jsonb),
 'results',coalesce((select jsonb_agg(to_jsonb(p) order by username,id) from people p where id in(select id from search_ids)),'[]'::jsonb),
 'invitations',coalesce((select jsonb_agg(to_jsonb(i)) from invites i),'[]'::jsonb),
 'showOnline',coalesce((select show_online from public.player_presence where profile_id=actor_id),false),
 'followingCount',(select count(*) from outgoing),'followerCount',(select count(*) from incoming));
$$;
revoke all on function public.player_social_dashboard(uuid,text) from public, anon, authenticated;
grant execute on function public.player_social_dashboard(uuid,text) to service_role;
