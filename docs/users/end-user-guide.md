# BookedAI End User Guide

## Audience

This guide is for the person visiting `bookedai.au` to discover services, chat with the assistant, and submit a booking or consultation request.

## What the End User Sees

The end user interacts mainly with:

- the public marketing website
- the booking assistant popup
- pricing and booking call-to-action paths
- confirmation and follow-up messages

## Main User Journeys

### Discover services

The user can:

- browse the public site
- open the assistant
- ask for service recommendations
- refine results by context such as timing, category, or location

### Ask the assistant for help

The assistant is intended to:

- understand natural-language questions
- recommend relevant services from the active catalog
- ask clarifying questions where needed
- optionally consider location context
- show event-related recommendations when the user asks about AI events

On `product.bookedai.au`, especially on phone-sized screens, the user should now see:

- a compact top bar instead of a tall introductory hero once the chat-led product surface is active
- the largest share of the screen reserved for BookedAI agent conversation and message history
- a bottom bar for switching between `Chat` and `Booking`
- the same underlying BookedAI shortlist and booking flow, but opened in a clearer secondary booking panel instead of always filling the main chat viewport
- search-result cards that keep the image thumbnail on the left side, with the service or event title and key booking facts flowing immediately to the right for faster scanning
- the refreshed landing template keeps the BookedAI logo larger and easier to recognize in the main header and footer, while still leaving the navigation and CTA area feeling balanced rather than crowded

### Start a booking

When a user wants to book:

- they choose a service
- they provide contact and scheduling information
- the system creates a booking session
- the system may create a payment link and send confirmation email

### Submit a pricing consultation

When a user is evaluating BookedAI as a product:

- they can request a consultation
- the platform may schedule a Zoho meeting if configured
- the platform may create a Stripe checkout if configured
- confirmation details may be emailed

## End User Expectations

The experience should feel:

- clear
- trustworthy
- fast
- mobile-friendly
- consistent from assistant response to booking confirmation
- native-app-like on `product.bookedai.au` phone layouts, with no horizontal overflow and no hidden primary content area

## User-Facing Dependencies

The end user experience depends on:

- service catalog quality
- AI response quality
- email configuration
- payment configuration
- workflow availability

If one of these is degraded, the user may still see a partial experience instead of a fully automated one.

## End User Impact Areas for Future Changes

When changing the platform, review the impact on:

- recommendation quality
- booking completion clarity
- confirmation reliability
- message tone and trust
- mobile accessibility

## Documentation Maintenance Rule

If the public UX, booking assistant flow, or confirmation flow changes, this document must be reviewed and updated.
