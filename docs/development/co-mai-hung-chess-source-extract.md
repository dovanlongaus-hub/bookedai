# Co Mai Hung Chess Class Source Extract

Date: `2026-04-18`

Document status: `parsed source note`

## Source file

- [XesZr6pjpiOaMMduIhpspQ.pdf](/home/dovanlong/BookedAI/storage/uploads/documents/fe41/XesZr6pjpiOaMMduIhpspQ.pdf)

## Interpreted source title

- `HOC PHI LOP CO VUA CO MAI HUNG`

## Key business description from the PDF

- students are taught directly by `Women Grandmaster - FIDE Trainer - FIDE Arbiter`
- the brochure claims more than `20 years` of playing and coaching experience
- positioning emphasizes strategic thinking, reasoning, competition readiness, and faster progress than ordinary study

## Parsed class structure

The brochure clearly separates:

- `online classes`
- `in-person classes`
- `60 minutes per session`
- `90 minutes per session`
- `group tiers`
- `private 1-1`

## Parsed pricing table from the PDF

### Online - 60 minutes

- under 10 students: `260,000 VND / student / session`
- 3-5 students: `520,000 VND / student / session`
- 2 students: `780,000 VND / student / session`
- private 1-1: `1,040,000 VND / session`

### Online - 90 minutes

- under 10 students: `390,000 VND / student / session`
- 3-5 students: `650,000 VND / student / session`
- 2 students: `1,040,000 VND / student / session`
- private 1-1: `1,300,000 VND / session`

### In person - 60 minutes

- under 10 students: `390,000 VND / student / session`
- 3-5 students: `650,000 VND / student / session`
- 2 students: `910,000 VND / student / session`
- private 1-1: `1,300,000 VND / session`

### In person - 90 minutes

- under 10 students: `468,000 VND / student / session`
- 3-5 students: `780,000 VND / student / session`
- 2 students: `1,170,000 VND / student / session`
- private 1-1: `1,560,000 VND / session`

### Extra fee

- travel surcharge when teaching at the student home: `300,000 VND / session`

## Parsed benefits and positioning

- special pricing treatment for very young students aged `4-7`
- students can participate in domestic and international tournaments
- extra support for tournament preparation, tactical advice, and coach accompaniment through competition
- teaching support also references coach or trainer credentials tied to master-level and international arbiter background

## Data-mapping decision for BookedAI

This source has enough structure to seed a real tenant and review-state catalog, but it does not provide enough normalized booking data to publish directly.

Known gaps from the source:

- no explicit website URL
- no booking URL
- no email or phone contact
- no exact city or venue
- pricing is in `VND`, so tenant onboarding must preserve non-AUD pricing truth even while older public matching still prefers `amount_aud`

## Seed strategy chosen

The repo now seeds:

- official sample tenant slug: `co-mai-hung-chess-class`
- locale: `vi-VN`
- timezone: `Asia/Ho_Chi_Minh`
- theme: chess class or kids strategy coaching
- eight review-state service rows derived from:
  - online group 60
  - online private 60
  - online group 90
  - online private 90
  - in-person group 60
  - in-person private 60
  - in-person group 90
  - in-person private 90

These rows are intentionally seeded in `review` state instead of `published` state.

On `2026-04-18`, the repo also gained one separate curated pilot migration:

- `backend/migrations/sql/009_co_mai_hung_chess_published_pilot_row.sql`

That pilot row exists only to validate tenant-first public chess discovery for queries such as `chess classes in Sydney`. It does not change the policy that the original eight brochure-derived rows remain source-truth records in `review`.

## Carry-forward requirement

Before this tenant should be considered public-search ready, BookedAI still needs:

- completed support now exists for tenant-side `currency_code` and `display_price`, but public publish policy still needs to treat source-document pricing and booking-path completeness more explicitly
- richer source-document ingestion and review workflows for PDF-first onboarding
- direct contact and booking-path completion
- clearer venue or service-area confirmation
