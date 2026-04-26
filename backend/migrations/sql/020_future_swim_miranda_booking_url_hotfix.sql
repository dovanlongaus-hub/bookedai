-- BookedAI Phase 1.9
-- Migration 020: replace dead Future Swim Miranda booking/source URL with live locations page
-- Additive only. This hotfix avoids a published tenant row pointing at a 404 page.

update service_merchant_profiles
set
  booking_url = 'https://futureswim.com.au/locations/',
  source_url = 'https://futureswim.com.au/locations/',
  updated_at = now()
where service_id = 'future-swim-miranda-kids-swimming-lessons'
  and (
    booking_url = 'https://futureswim.com.au/locations/miranda/'
    or source_url = 'https://futureswim.com.au/locations/miranda/'
  );
