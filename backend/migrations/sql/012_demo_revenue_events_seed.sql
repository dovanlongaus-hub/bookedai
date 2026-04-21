-- BookedAI Migration 012
-- Seed realistic demo booking session events and payment intents so the Revenue
-- Capture widget shows meaningful live data during hackathon demos.
-- Safe to run multiple times (uses on conflict / do nothing patterns).

-- Insert 18 booking_session_created events in the last 30 days
-- 14 confirmed (workflow_status='triggered'), 4 incomplete (workflow_status=null)
insert into conversation_events (
  source, event_type, conversation_id, sender_name, sender_email,
  message_text, ai_intent, ai_reply, workflow_status, metadata_json, created_at
)
select
  'booking_assistant',
  'booking_session_created',
  'demo-session-' || row_number() over (),
  sessions.customer_name,
  sessions.customer_email,
  sessions.message_text,
  'booking',
  sessions.ai_reply,
  sessions.workflow_status,
  '{"source": "demo_seed", "hackathon": true}'::jsonb,
  now() - (random() * interval '29 days')
from (
  values
    ('Sarah Mitchell', 'sarah.mitchell@example.com', 'Book swim lesson for my 5-year-old near Caringbah', 'Great choice! Future Swim Caringbah has availability Sunday 10am — confirmed below.', 'triggered'),
    ('James Chen', 'james.chen@example.com', 'Kids swimming lessons Miranda area weekend', 'Found the perfect spot — Future Swim Miranda on Saturday 9am suits your schedule.', 'triggered'),
    ('Emily Rodriguez', 'emily.r@example.com', 'Swimming for toddler 2 years old Leichhardt', 'Booked! Future Swim Leichhardt has baby splash from age 2 — confirmed.', 'triggered'),
    ('Michael Wong', 'mwong@example.com', 'Learn to swim for 8 year old near St Peters', 'Your child will love Future Swim St Peters — beginners class confirmed for Saturday 11am.', 'triggered'),
    ('Lisa Park', 'lisa.park@example.com', 'Kids swim school Kirrawee Sunday morning', 'Future Swim Kirrawee is confirmed — Sunday 10:30am class for beginners.', 'triggered'),
    ('David Thompson', 'dthompson@example.com', 'Swim lessons Rouse Hill 6 year old girl', 'Booking confirmed — Future Swim Rouse Hill, Saturday 9:30am beginners.', 'triggered'),
    ('Anh Nguyen', 'anh.nguyen@example.com', 'Swimming school near Caringbah weekends', 'Future Swim Caringbah Saturday 11am — booking confirmed and email sent.', 'triggered'),
    ('Jessica Brown', 'jess.brown@example.com', 'Kids swimming lessons for 4 year old', 'Confirmed — Future Swim Miranda Sunday 9am is perfect for a 4-year-old beginner.', 'triggered'),
    ('Tom Wilson', 'tom.w@example.com', 'Book stroke correction class teen 14 years', 'Future Swim Leichhardt stroke correction class confirmed — Saturday 12pm.', 'triggered'),
    ('Maria Santos', 'maria.santos@example.com', 'Baby swimming lessons Caringbah', 'Future Swim Caringbah baby water familiarisation class confirmed — Tuesday 10am.', 'triggered'),
    ('Kevin Lee', 'kevin.lee@example.com', 'Pre squad swimming Caringbah area', 'Pre-squad session confirmed at Future Swim Caringbah — Thursday 4:30pm.', 'triggered'),
    ('Rachel Kim', 'rachel.k@example.com', 'Kids learn to swim near St Peters Sydney', 'Future Swim St Peters Saturday 10am learn-to-swim confirmed for your 6-year-old.', 'triggered'),
    ('Alex Turner', 'alex.t@example.com', 'Swimming class for 7 year old beginner Miranda', 'Great! Future Swim Miranda beginners Sunday 11am confirmed — see email for details.', 'triggered'),
    ('Sophie Davis', 'sophie.d@example.com', 'Book swim for 3 year old toddler Kirrawee', 'Future Swim Kirrawee toddler class Saturday 9am confirmed!', 'triggered'),
    ('Nathan Clark', 'nathan.c@example.com', 'Swimming lessons near me weekend', null, null),
    ('Isabella Martin', 'isabella.m@example.com', 'Kids swim school Caringbah availability', null, null),
    ('Oliver Johnson', 'oliver.j@example.com', 'Learn to swim program for kids Sydney', null, null),
    ('Chloe Anderson', 'chloe.a@example.com', 'Swimming near Rouse Hill for 5 year old', null, null)
) as sessions(customer_name, customer_email, message_text, ai_reply, workflow_status)
where not exists (
  select 1 from conversation_events
  where source = 'booking_assistant'
    and event_type = 'booking_session_created'
    and metadata_json->>'source' = 'demo_seed'
  limit 1
);

-- Insert payment intents for the 14 confirmed sessions (avg A$30/lesson)
insert into payment_intents (
  tenant_id,
  booking_reference,
  amount_aud,
  currency_code,
  status,
  provider,
  created_at
)
select
  t.id,
  'demo-' || lpad((floor(random() * 90000) + 10000)::text, 5, '0'),
  30.00,
  'AUD',
  'paid',
  'stripe',
  now() - (random() * interval '28 days')
from tenants t
cross join generate_series(1, 14)
where t.slug = 'future-swim'
  and not exists (
    select 1 from payment_intents
    where provider = 'stripe'
      and status = 'paid'
      and booking_reference like 'demo-%'
    limit 1
  );
