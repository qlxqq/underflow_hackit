insert into public.friendships (requester_id, addressee_id, status)
select first_p.user_id, second_p.user_id, 'accepted'
from (select user_id from public.profiles order by created_at limit 1) as first_p,
     (select user_id from public.profiles order by created_at desc limit 1) as second_p
where first_p.user_id <> second_p.user_id;