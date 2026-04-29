import { useCallback, useEffect, useMemo, useState } from 'react';

import '../../theme/aimentor-tokens.css';
import { BookingAssistantDialog } from '../../components/landing/assistant/BookingAssistantDialog';
import type { PublicBookingAssistantRuntimeConfig } from '../../components/landing/assistant/publicBookingAssistantV1';
import { bookingAssistantContent } from '../../components/landing/data';
import { createPublicAssistantRuntimeConfig } from '../../shared/runtime/publicAssistantRuntime';

const AI_MENTOR_TENANT_REF = 'ai-mentor-doer';

const LOCALE_STORAGE_KEY = 'aimentor.bookedai.locale';
const PORTAL_BASE_URL = 'https://aimentor.bookedai.au/account';

// Founding Cohort 2026 Q2 — kept in sync with
// backend/migrations/sql/035_aimentor_copy_refresh_promo_2026_q2.sql
const PROMO_DEADLINE_ISO = '2026-05-31T23:59:59+10:00';

type Locale = 'en' | 'vi';

const aiMentorBookedAIRuntimeConfig: PublicBookingAssistantRuntimeConfig =
  createPublicAssistantRuntimeConfig({
    channel: 'public_web',
    tenantRef: AI_MENTOR_TENANT_REF,
    deploymentMode: 'standalone_app',
    widgetId: 'aimentor-bookedai-au-app',
    source: 'aimentor_bookedai_au',
    medium: 'partner_subdomain',
    campaign: 'aimentor_bookedai_au_partner_app',
    surface: 'aimentor_bookedai_au_partner_app',
  });

const dict = {
  en: {
    htmlTitle: 'AI Mentor 1-on-1 — Build, ship, and earn with AI · 100% online',
    htmlTitleFeedback: 'AI Mentor — Send feedback',
    promo: {
      eyebrow: 'Founding Cohort 2026',
      headline: 'First 50 students get 25% off — until 31 May',
      countdownPrefix: 'Closes in',
      countdownDays: 'd',
      countdownHours: 'h',
      countdownMinutes: 'm',
      bookCta: 'Reserve at 25% off →',
    },
    nav: {
      brandName: 'AI Mentor',
      brandTag: '1-on-1 AI Programming · Online',
      programs: 'Programs',
      profile: 'Mentor',
      howItWorks: 'How it works',
      results: 'Results',
      faq: 'FAQ',
      enroll: 'Reserve seat',
      studentLogin: 'Student login',
    },
    languageToggle: { label: 'Language', en: 'EN', vi: 'VI' },
    hero: {
      eyebrow: '1-on-1 AI Programming Mentorship · 100% online',
      titleLeft: 'From AI curious to ',
      titleEm: 'AI shipping',
      titleRight: ' — in weeks, not years.',
      lead:
        'Private 1-on-1 sessions and small-group cohorts on Zoho Meeting that turn your AI ideas into working products. Most students walk away from session one with something they can demo today.',
      reserveCta: 'Reserve my Founding Cohort seat →',
      chatCta: 'Talk to mentor first',
      trustChips: [
        '1,200+ hours mentored',
        'Dedicated email + CRM',
        'Bilingual EN / VI',
        'BookedAI-powered scheduling',
      ],
      statValues: [
        { value: '60 min', label: 'To your first AI prototype' },
        { value: '1,200+', label: 'Hours of 1-on-1 mentorship' },
        { value: '100%', label: 'Online — Zoho Meeting + Google Calendar' },
      ],
      mentorCardTag: 'Your mentor — online now',
      mentorName: 'Long Đỗ Văn',
      mentorMeta: 'Founder · Senior AI Engineer · BookedAI. Shipping AI products since 2018.',
      mentorQuote:
        '"You won\'t graduate with slides. You\'ll graduate with a working AI product, deployed."',
      sessionPreviewTag: 'Your session — fully online',
      sessionPreviewLines: [
        'Zoho Meeting — HD video, screen share, recording you keep.',
        'Google Calendar invite + .ics in your booking email.',
        'Mentor follow-up on Telegram or WhatsApp — your pick.',
      ],
      mentorOnline: 'Online · replies in minutes',
    },
    outcomes: {
      eyebrow: "What you'll walk away with",
      title: 'Three outcomes. Pick the one that matches where you are.',
      lead: 'Working products. Clear next steps. Real results — not slides, not a tutorial.',
      items: [
        {
          icon: 'build',
          title: 'A working AI prototype',
          body: 'By the end of session one you have something you can demo and use today. We start from your real workflow on Zoho Meeting, not a toy example.',
          tag: 'Ship in 60 min',
        },
        {
          icon: 'automate',
          title: 'An automation that runs without you',
          body: 'Mentor builds with you a workflow that takes hours off your week — email triage, content ops, customer support, sales follow-up.',
          tag: '5–10 hrs / week saved',
        },
        {
          icon: 'earn',
          title: 'A product you can charge for',
          body: 'Turn your AI prototype into a packaged, monetisable product with pricing, Stripe checkout, onboarding, and the ops to keep it running.',
          tag: 'Side product or full launch',
        },
      ],
    },
    profile: {
      eyebrow: 'Your mentor',
      name: 'Long Đỗ Văn',
      handle: 'in/dovanlong',
      linkedinUrl: 'https://www.linkedin.com/in/dovanlong/',
      title: 'Senior practitioner. Shipping AI products since 2018.',
      bio:
        'Long is the Founder of BookedAI and the lead mentor for every AI Mentor 1-on-1 Pro session. Across 7+ years of shipping production AI he has built booking systems, business automations, Stripe + Zoho workflows, and AI products customers can pay for. Sessions are pragmatic, hands-on, and outcomes-first: you write code, ship something, and leave with a working product step.',
      credentialsTitle: 'Credentials',
      credentials: [
        'Founder · BookedAI (live booking and revenue engine for service businesses)',
        '7+ years shipping production AI products',
        '1,200+ hours of 1-on-1 mentoring across founders + engineers',
        'Bilingual mentor — sessions delivered in English or Vietnamese',
        'Stripe-secured payment + GDPR-aware data handling',
      ],
      experienceTitle: 'Experience',
      experience: [
        {
          period: '2024 — Now',
          role: 'Founder · Senior AI Engineer',
          org: 'BookedAI',
          bullet: 'Built BookedAI end-to-end: chat-driven booking, Stripe checkout, Zoho CRM + Meeting integration, and dedicated business booking pages.',
        },
        {
          period: '2021 — 2024',
          role: 'Senior AI Engineer',
          org: 'Production AI teams',
          bullet: 'Shipped AI assistants and automation for email triage, sales follow-up, customer support, and content operations.',
        },
        {
          period: '2018 — 2021',
          role: 'AI / ML Engineer',
          org: 'Early AI product teams',
          bullet: 'Started shipping production ML models — recommendation, classification, and conversational interfaces well before LLMs went mainstream.',
        },
      ],
      skillsTitle: 'Stack & expertise',
      skills: [
        'Python', 'TypeScript', 'React', 'FastAPI', 'PostgreSQL',
        'LangChain', 'OpenAI', 'Anthropic API', 'AI assistants', 'Knowledge search',
        'Stripe', 'Zoho CRM', 'Zoho Meeting', 'Google Calendar', 'Booking pages',
        'Telegram / WhatsApp bots', 'Business automation', 'Bilingual EN / VI',
      ],
      projectsTitle: 'Featured work',
      projects: [
        {
          name: 'BookedAI',
          url: 'https://bookedai.au',
          description: 'Booking and revenue engine for service businesses: chat-driven search, Stripe checkout, Zoho CRM + Meeting + Calendar integration, and dedicated landing pages.',
        },
        {
          name: 'AI Mentor 1-on-1 Pro',
          url: 'https://aimentor.bookedai.au',
          description: 'This very page. 100% online AI programming mentorship — 10 programs, 25% Founding Cohort discount, Zoho Meeting + Google Calendar built-in.',
        },
      ],
      includedTitle: "What's included in every program",
      included: [
        '1-on-1 sessions on Zoho Meeting (HD video, screen share, auto-recording you keep)',
        'Google Calendar invite + .ics attachment in your booking email',
        'Working code + a 5-min demo at the end of every session',
        'Mentor follow-up on Telegram or WhatsApp — your pick of channel',
        'Monthly progress check-in email (auto-localised EN or VI)',
        'Per-session feedback link, mentor reviews before next session',
        'Student portal at aimentor.bookedai.au/account (Google login)',
        'Stripe receipt + 7-day money-back guarantee',
      ],
      ctaPrimary: 'Reserve my Founding Cohort seat →',
      ctaSecondary: 'Talk to mentor first',
      linkedinCta: 'See full profile on LinkedIn →',
    },
    catalog: {
      eyebrow: 'Pick your path',
      title: '10 programs · 100% online · Founding Cohort 25% off',
      lead:
        "Whether you're starting from scratch or scaling a working AI side-product, there's a path that fits your timeline and budget. All sessions on Zoho Meeting.",
      groupNote: 'Group cohorts require a minimum of 5 students.',
      bookCta: 'Reserve at 25% off',
      wasLabel: 'was',
      savingsLabel: 'save',
      programs: [
        { id: 'ai-mentor-private-first-ai-app-60', tier: 'Private 1-on-1', name: 'Your first AI app — built in 60 minutes', summary: 'One focused session on Zoho Meeting. Walk away with a working AI prototype you can demo today. Built on your real workflow, not a toy example.', originalAmount: 180, discountedAmount: 140, currency: 'AUD', suffix: '/ session', tags: ['1-on-1', 'Beginner-friendly', 'Real prototype'], icon: 'first-app', featured: false, customLabel: '' },
        { id: 'ai-mentor-private-executes-for-you-5h', tier: 'Private 1-on-1', name: 'AI that runs your work — 5 hours of automation', summary: '5 hours focused on automating real work in your stack — email triage, ops, content, customer support. Saves 5–10 hours a week for most students.', originalAmount: 930, discountedAmount: 700, currency: 'AUD', suffix: '/ 5 hours', tags: ['Automation', 'Hands-on', 'Saves 5–10 hrs/week'], icon: 'executes', featured: true, customLabel: '' },
        { id: 'ai-mentor-private-real-product-10h', tier: 'Private 1-on-1', name: 'Turn your AI into a paying product — 10 hours', summary: '10 hours focused on packaging your AI into a monetisable product — pricing, Stripe checkout, onboarding, and the ops to keep it running.', originalAmount: 1860, discountedAmount: 1400, currency: 'AUD', suffix: '/ 10 hours', tags: ['Product launch', 'Pricing & ops', 'Stripe integration'], icon: 'real-product', featured: false, customLabel: '' },
        { id: 'ai-mentor-private-project-based-builder', tier: 'Private 1-on-1', name: 'Project-based mentorship — built around your roadmap', summary: "Custom package shaped around the build you already have in flight. Mentor joins as a senior IC — sprint reviews, code reviews, ship dates.", originalAmount: null, discountedAmount: null, currency: 'AUD', customLabel: 'Custom pricing', suffix: 'Founding Cohort priority intake', tags: ['Custom scope', 'Senior IC', 'Sprint-by-sprint'], icon: 'project-builder', featured: false },
        { id: 'ai-mentor-private-ongoing-ops-support', tier: 'Private 1-on-1', name: 'Ongoing mentor + ops retainer — keep shipping', summary: 'Continuous mentor + ops support after your AI product launches. Monthly check-ins, on-demand pairing, ops escalation. Keep momentum.', originalAmount: null, discountedAmount: null, currency: 'AUD', customLabel: 'Pricing on request', suffix: 'Founding Cohort priority slot', tags: ['Retainer', 'Ops support', 'Monthly check-in'], icon: 'ongoing', featured: false },
        { id: 'ai-mentor-group-first-ai-app-60', tier: 'Small-group cohort', name: 'Group — Your first AI app in 60 minutes', summary: 'Same fast-start session, scoped for a small group of peers. Cheaper per person, same outcome. Live on Zoho Meeting.', originalAmount: 80, discountedAmount: 60, currency: 'AUD', suffix: '/ hour / person', tags: ['Group', 'Min 5 students', 'Beginner-friendly'], icon: 'first-app', featured: false, customLabel: '' },
        { id: 'ai-mentor-group-executes-for-you-5h', tier: 'Small-group cohort', name: 'Group — AI that runs your work', summary: '5-hour group cohort to automate real work across the team. Each member ships their own automation. Live on Zoho Meeting.', originalAmount: 390, discountedAmount: 290, currency: 'AUD', suffix: '/ 5 hours / person', tags: ['Group', 'Automation', 'Cohort'], icon: 'executes', featured: false, customLabel: '' },
        { id: 'ai-mentor-group-real-product-10h', tier: 'Small-group cohort', name: 'Group — Turn your AI into a paying product', summary: '10-hour cohort focused on shipping a monetised AI product. Peer feedback + senior mentor. Live on Zoho Meeting.', originalAmount: 780, discountedAmount: 580, currency: 'AUD', suffix: '/ 10 hours / person', tags: ['Group', 'Product launch', 'Cohort'], icon: 'real-product', featured: false, customLabel: '' },
        { id: 'ai-mentor-group-project-based-builder', tier: 'Small-group cohort', name: 'Group — Project-based AI builder cohort', summary: 'Group package shaped around a shared project the cohort ships together. Live on Zoho Meeting, peer review, senior mentor.', originalAmount: null, discountedAmount: null, currency: 'AUD', customLabel: 'Custom pricing', suffix: 'min 5 students · Founding Cohort priority', tags: ['Group', 'Custom scope', 'Project shipping'], icon: 'project-builder', featured: false },
        { id: 'ai-mentor-group-ongoing-ops-support', tier: 'Small-group cohort', name: 'Group — Ongoing mentor & ops retainer', summary: 'Continuous group mentor + ops support after your team ships. Monthly Zoho Meeting cohort review + on-demand pairing.', originalAmount: null, discountedAmount: null, currency: 'AUD', customLabel: 'Pricing on request', suffix: 'min 5 students · Founding Cohort priority', tags: ['Group', 'Retainer', 'Ops support'], icon: 'ongoing', featured: false },
      ],
    },
    flow: {
      eyebrow: 'How enrolment works',
      title: 'Reserve your seat in 4 minutes.',
      lead: 'No long forms, no sales calls. Pick a program, pay via Stripe, mentor reaches out within 24 hours with the Zoho Meeting link.',
      steps: [
        { title: 'Pick your program', body: 'Browse the 10 programs above. Private 1-on-1 if you want focus, group cohort if you want peers.' },
        { title: 'Choose your slot', body: 'Confirm your contact details. Sessions run on Zoho Meeting + Google Calendar, weekday evenings or weekends.' },
        { title: 'Secure your seat', body: 'Stripe checkout — card, Apple Pay, or Google Pay. Receipt arrives before you finish closing the tab.' },
        { title: 'Mentor confirms in 24h', body: 'Personal message on Telegram or WhatsApp + Google Calendar invite + Zoho Meeting link in your inbox.' },
      ],
    },
    trust: {
      eyebrow: 'Why students choose us',
      title: 'Real practitioners. Real outcomes. Real protection.',
      items: [
        { icon: 'shield', title: '7-day money-back guarantee', body: "If your first session isn't a fit, we refund — no questions, no friction." },
        { icon: 'sparkle', title: 'Senior practitioners, not influencers', body: 'Mentors are senior engineers shipping AI products since 2018. Real codebases, real outcomes.' },
        { icon: 'globe', title: '100% online · bilingual EN / VI', body: 'Zoho Meeting from any laptop. Sessions, follow-ups, and progress notes in EN or VI. Switch any time.' },
        { icon: 'lock', title: 'Secure Stripe payment', body: 'Receipts on the spot, refunds when you ask, no surprise charges. The same checkout used by Apple, Spotify, Shopify.' },
      ],
    },
    testimonials: {
      eyebrow: 'Student results',
      title: "What our students built — in their own words.",
      lead: 'Real outcomes from real students. Names abbreviated for privacy.',
      items: [
        { quote: 'I shipped my first working AI app on day 1. Two weeks later it was running in production for our team — saving 6 hours of weekly triage.', name: 'Linh N.', role: 'Product Manager · SaaS', program: 'AI that runs your work — 5 hours', initials: 'LN', gradientA: '#14a092', gradientB: '#0f5c54' },
        { quote: "We built an email-triage agent that saves me 8 hours a week. The program paid back in month one. I'm now on the 'real product' track.", name: 'Mark T.', role: 'Founder · 2-person startup', program: 'AI that runs your work · then Real product', initials: 'MT', gradientA: '#ff6b3d', gradientB: '#e84e1e' },
        { quote: "From zero AI experience to launching a side-product earning $400/mo in 90 days. Mentor stayed with me from prototype through Stripe checkout.", name: 'Anh P.', role: 'Engineer · weekend builder', program: 'Real product — 10 hours', initials: 'AP', gradientA: '#94e8d2', gradientB: '#1bc7b3' },
      ],
    },
    register: {
      eyebrow: 'Not sure which program fits?',
      title: 'Tell us in 30 seconds. Mentor follows up in 24 hours.',
      lead: 'Drop your contact + the program you are looking at. Your mentor will reach out personally on Telegram, WhatsApp, or email — no automated drip.',
      fields: { fullName: 'Full name', email: 'Email', phone: 'Phone (Telegram or WhatsApp ideally)', program: 'Program of interest', message: 'What do you want to build with AI?' },
      placeholders: { fullName: 'e.g. Linh Nguyen', email: 'you@email.com', phone: '+84 / +61 …', message: 'A one-line description of the AI product or workflow you want to build.' },
      programChoose: 'Choose a program',
      consent: 'By submitting, you agree the AI Mentor team can contact you about this enquiry. Unsubscribe any time.',
      submit: 'Send my interest',
      submitting: 'Sending…',
      success: { title: 'Got it — your mentor will reach out within 24 hours.', body: 'Check your email and Telegram / WhatsApp for the first message. You can also pick a slot directly using the chat above.', cta: 'Pick a slot now' },
      error: 'Could not send your enquiry. Please retry — or message us on Telegram / WhatsApp.',
    },
    faq: {
      eyebrow: 'Frequently asked questions',
      title: 'Everything students ask before they reserve a seat.',
      items: [
        { q: 'Are sessions in person or online?', a: '100% online. Every session runs on Zoho Meeting (HD video, screen share, auto-recording you keep). You receive a Google Calendar invite + .ics attachment after mentor confirms.' },
        { q: 'Do I need to know how to code?', a: 'No. The "first AI app in 60 minutes" program is built for non-technical learners — you walk away with a working AI prototype using no-code or low-code tools. The "real product" program goes deeper into shipping code.' },
        { q: 'Are sessions in English or Vietnamese?', a: 'Both. Mentor follow-up emails, Telegram, and WhatsApp messages all support EN / VI. You can switch the website language at the top of the page any time.' },
        { q: 'How do I pay?', a: 'Secure Stripe checkout. Cards, Apple Pay, and Google Pay are all supported. Receipt arrives instantly. The same checkout used by Apple, Spotify, Shopify.' },
        { q: 'What if my first session is not a fit?', a: '7-day money-back guarantee. If the fit is wrong, we refund — no questions, no friction. Beyond 7 days you can convert remaining hours to a different program.' },
        { q: 'Can I reschedule?', a: 'Yes. Use the link in your booking email to reschedule, pause, or downgrade. Or message your mentor on Telegram / WhatsApp.' },
        { q: "What's the Founding Cohort?", a: 'The first 50 students who enrol get 25% off all listed programs and shape the curriculum with us. Until 31 May 2026 or 50 seats — whichever comes first.' },
        { q: 'How long until I see results?', a: 'Most students leave session one with a working AI prototype they can demo. By session three, you typically have an automation running for you. Real revenue from a side-product usually lands in 60–90 days for engaged students.' },
      ],
    },
    channels: {
      title: 'Talk to a mentor on your channel',
      lead: 'Pick the channel you actually use. Mentor will pick up on the same thread — no support tickets, no waiting.',
      telegram: 'Continue on Telegram',
      whatsapp: 'Continue on WhatsApp',
      email: 'Email mentor',
    },
    quickPrompts: [
      'I want a 1-on-1 session to build my first AI app in one hour.',
      'Help me choose a package to automate real work with AI.',
      'I need a project-based mentor for my team.',
      'I want to turn my AI prototype into a paying product.',
    ],
    finalCta: {
      eyebrow: 'Ready to ship?',
      title: 'Your first AI product is one Zoho Meeting away.',
      lead: "Reserve your Founding Cohort seat now — 25% off until 31 May. If your first session isn't a fit, we refund within 7 days.",
      primary: 'Reserve my seat — 25% off →',
      secondary: 'Talk to mentor first',
      moneyBack: '7-day money-back guarantee',
      bilingual: 'Sessions in EN or VI',
      bookFast: 'Mentor replies within 24 hours',
    },
    stickyCta: { lead: 'Founding Cohort 25% off', cta: 'Reserve' },
    footer: {
      tagline: 'Senior AI mentors. 1-on-1 and small-group cohorts on Zoho Meeting. Real outcomes — not slides.',
      links: { programs: 'Programs', profile: 'Mentor profile', howItWorks: 'How it works', results: 'Student results', faq: 'FAQ', login: 'Student login' },
      contactTitle: 'Talk to a mentor',
      legal: '© AI Mentor 1-on-1 Pro. All rights reserved.',
    },
    feedback: {
      title: 'How was your AI Mentor session?',
      bookingMissing: 'Booking reference missing',
      bookingMissingBody: 'Open the feedback link from your AI Mentor email so the right booking is loaded.',
      ratingLegend: 'Rating',
      commentLabel: 'Comment (optional)',
      commentPlaceholder: 'What worked? What can your mentor improve next session?',
      recommend: "I'd recommend AI Mentor to a friend.",
      sendCta: 'Send my feedback',
      sending: 'Sending…',
      successTitle: 'Thanks for your feedback.',
      successBodyPrefix: "We've recorded it against booking ",
      successBodySuffix: '. Your mentor will see it before the next session.',
      openBooking: 'Open my booking',
      missingError: 'Booking reference is required to send feedback.',
      genericError: 'Could not save your feedback. Please try again.',
      networkError: 'Could not reach the server. Please retry in a moment.',
    },
  },
  vi: {
    htmlTitle: 'AI Mentor 1-1 — Học AI lập trình, ship sản phẩm thật · 100% online',
    htmlTitleFeedback: 'AI Mentor — Gửi phản hồi',
    promo: {
      eyebrow: 'Cohort Khởi Tạo 2026',
      headline: '50 học viên đầu tiên giảm 25% — tới hết 31/05',
      countdownPrefix: 'Còn',
      countdownDays: 'ngày',
      countdownHours: 'giờ',
      countdownMinutes: 'phút',
      bookCta: 'Giữ chỗ giảm 25% →',
    },
    nav: { brandName: 'AI Mentor', brandTag: 'Mentor 1-1 lập trình AI · Online', programs: 'Chương trình', profile: 'Mentor', howItWorks: 'Quy trình', results: 'Học viên', faq: 'Hỏi đáp', enroll: 'Giữ chỗ', studentLogin: 'Học viên' },
    languageToggle: { label: 'Ngôn ngữ', en: 'EN', vi: 'VI' },
    hero: {
      eyebrow: 'Mentor 1-1 lập trình AI · 100% online',
      titleLeft: 'Từ tò mò AI tới ',
      titleEm: 'ship sản phẩm AI',
      titleRight: ' — trong vài tuần, không phải vài năm.',
      lead: 'Lớp 1-1 riêng và cohort nhóm nhỏ qua Zoho Meeting biến ý tưởng AI thành sản phẩm thật. Đa số học viên ra về sau buổi đầu đã có thứ để demo ngay hôm đó.',
      reserveCta: 'Giữ chỗ Cohort Khởi Tạo →',
      chatCta: 'Trao đổi với mentor',
      trustChips: ['1.200+ giờ mentor', 'Email + CRM riêng', 'Song ngữ EN / VI', 'Lịch học vận hành bởi BookedAI'],
      statValues: [
        { value: '60 phút', label: 'Tới prototype AI đầu tiên' },
        { value: '1.200+', label: 'Giờ mentor 1-1' },
        { value: '100%', label: 'Online — Zoho Meeting + Google Calendar' },
      ],
      mentorCardTag: 'Mentor đang online',
      mentorName: 'Long Đỗ Văn',
      mentorMeta: 'Founder · Senior AI Engineer · BookedAI. Đã ship sản phẩm AI từ 2018.',
      mentorQuote: '"Học xong bạn không cầm slide. Bạn cầm một sản phẩm AI đã chạy được."',
      sessionPreviewTag: 'Buổi học của bạn — 100% online',
      sessionPreviewLines: [
        'Zoho Meeting — HD, share màn hình, tự ghi hình bạn giữ.',
        'Google Calendar invite + file .ics gửi vào email.',
        'Mentor follow-up qua Telegram hoặc WhatsApp — bạn chọn.',
      ],
      mentorOnline: 'Đang online · phản hồi trong vài phút',
    },
    outcomes: {
      eyebrow: 'Bạn sẽ ra về với gì',
      title: 'Ba kết quả. Chọn lộ trình phù hợp với hiện tại của bạn.',
      lead: 'Sản phẩm thật. Code chạy được. Kết quả thật — không slide, không tutorial.',
      items: [
        { icon: 'build', title: 'Một prototype AI chạy được', body: 'Cuối buổi đầu trên Zoho Meeting bạn đã có thứ để demo và dùng được trong hôm nay. Bắt đầu từ workflow thật của bạn.', tag: 'Ship trong 60 phút' },
        { icon: 'automate', title: 'Một automation tự chạy không cần bạn', body: 'Mentor cùng bạn xây workflow tiết kiệm hàng giờ mỗi tuần — phân loại email, vận hành content, hỗ trợ khách hàng, follow-up sales.', tag: 'Tiết kiệm 5–10 giờ / tuần' },
        { icon: 'earn', title: 'Một sản phẩm có thể bán', body: 'Biến prototype AI thành sản phẩm có thể tính tiền — pricing, Stripe checkout, onboarding, vận hành để duy trì.', tag: 'Side product hoặc launch full' },
      ],
    },
    profile: {
      eyebrow: 'Mentor của bạn',
      name: 'Long Đỗ Văn',
      handle: 'in/dovanlong',
      linkedinUrl: 'https://www.linkedin.com/in/dovanlong/',
      title: 'Senior practitioner. Đã ship sản phẩm AI từ 2018.',
      bio: 'Long là Founder của BookedAI và mentor chính cho mọi buổi AI Mentor 1-1 Pro. 7+ năm ship sản phẩm AI: hệ thống booking, automation vận hành, workflow Stripe + Zoho, và sản phẩm AI có khách hàng trả tiền. Buổi học thực dụng, hands-on, outcomes-first: bạn viết code thật, ship sản phẩm thật, ra về với bước sản phẩm chạy được.',
      credentialsTitle: 'Background',
      credentials: [
        'Founder · BookedAI (AI Revenue Engine đang chạy cho doanh nghiệp dịch vụ)',
        '7+ năm ship sản phẩm AI production',
        '1.200+ giờ mentor 1-1 cho founder và engineer',
        'Mentor song ngữ — buổi học bằng EN hoặc VI',
        'Thanh toán Stripe an toàn, xử lý dữ liệu chuẩn GDPR',
      ],
      experienceTitle: 'Kinh nghiệm',
      experience: [
        {
          period: '2024 — Hiện tại',
          role: 'Founder · Senior AI Engineer',
          org: 'BookedAI',
          bullet: 'Xây BookedAI end-to-end: booking bằng chat, Stripe checkout, tích hợp Zoho CRM + Meeting, và landing page riêng cho từng dịch vụ.',
        },
        {
          period: '2021 — 2024',
          role: 'Senior AI Engineer',
          org: 'Production AI teams',
          bullet: 'Ship trợ lý AI và automation cho phân loại email, follow-up sales, hỗ trợ khách hàng, và vận hành content.',
        },
        {
          period: '2018 — 2021',
          role: 'AI / ML Engineer',
          org: 'Đội AI sản phẩm sớm',
          bullet: 'Bắt đầu ship ML production — recommendation, classification, conversational interfaces từ trước khi LLM phổ biến.',
        },
      ],
      skillsTitle: 'Stack & chuyên môn',
      skills: [
        'Python', 'TypeScript', 'React', 'FastAPI', 'PostgreSQL',
        'LangChain', 'OpenAI', 'Anthropic API', 'Trợ lý AI', 'Knowledge search',
        'Stripe', 'Zoho CRM', 'Zoho Meeting', 'Google Calendar', 'Landing page booking',
        'Telegram / WhatsApp bot', 'Automation vận hành', 'Song ngữ EN / VI',
      ],
      projectsTitle: 'Sản phẩm tiêu biểu',
      projects: [
        {
          name: 'BookedAI',
          url: 'https://bookedai.au',
          description: 'AI Revenue Engine cho doanh nghiệp dịch vụ: tìm kiếm bằng chat, Stripe checkout, Zoho CRM + Meeting + Calendar, và landing page booking riêng.',
        },
        {
          name: 'AI Mentor 1-1 Pro',
          url: 'https://aimentor.bookedai.au',
          description: 'Chính là trang này. Mentor lập trình AI 100% online — 10 chương trình, Cohort Khởi Tạo giảm 25%, tích hợp Zoho Meeting + Google Calendar.',
        },
      ],
      includedTitle: 'Mọi gói đều có',
      included: [
        'Buổi 1-1 trên Zoho Meeting (HD, share màn hình, tự ghi hình bạn giữ)',
        'Google Calendar invite + file .ics đính kèm email xác nhận',
        'Code chạy được + 5 phút demo cuối mỗi buổi',
        'Mentor follow-up qua Telegram hoặc WhatsApp — bạn chọn kênh',
        'Email check-in tiến độ hàng tháng (tự động EN hoặc VI)',
        'Link feedback sau mỗi buổi, mentor review trước buổi tiếp theo',
        'Portal học viên tại aimentor.bookedai.au/account (đăng nhập Google)',
        'Hoá đơn Stripe + bảo đảm hoàn tiền 7 ngày',
      ],
      ctaPrimary: 'Giữ chỗ Cohort Khởi Tạo →',
      ctaSecondary: 'Trao đổi với mentor trước',
      linkedinCta: 'Xem profile đầy đủ trên LinkedIn →',
    },
    catalog: {
      eyebrow: 'Chọn lộ trình của bạn',
      title: '10 chương trình · 100% online · Cohort Khởi Tạo giảm 25%',
      lead: 'Dù bạn bắt đầu từ con số 0 hay đang scale một AI side-product đã chạy, đều có lộ trình phù hợp ngân sách và thời gian. Mọi buổi học trên Zoho Meeting.',
      groupNote: 'Cohort nhóm yêu cầu tối thiểu 5 học viên.',
      bookCta: 'Giữ chỗ giảm 25%',
      wasLabel: 'gốc',
      savingsLabel: 'tiết kiệm',
      programs: [
        { id: 'ai-mentor-private-first-ai-app-60', tier: 'Lớp riêng 1-1', name: 'Ứng dụng AI đầu tiên — xây trong 60 phút', summary: 'Một buổi tập trung trên Zoho Meeting. Ra về với prototype AI có thể demo ngay. Bắt đầu từ workflow thật của bạn.', originalAmount: 180, discountedAmount: 140, currency: 'AUD', suffix: '/ buổi', tags: ['1-1', 'Cho người mới', 'Prototype thật'], icon: 'first-app', featured: false, customLabel: '' },
        { id: 'ai-mentor-private-executes-for-you-5h', tier: 'Lớp riêng 1-1', name: 'AI tự vận hành công việc — 5 giờ tự động hoá', summary: '5 giờ tập trung tự động hoá công việc thật trong stack của bạn — email, vận hành, content, chăm sóc khách. Tiết kiệm 5–10 giờ/tuần.', originalAmount: 930, discountedAmount: 700, currency: 'AUD', suffix: '/ 5 giờ', tags: ['Tự động hoá', 'Thực chiến', 'Tiết kiệm 5–10 giờ/tuần'], icon: 'executes', featured: true, customLabel: '' },
        { id: 'ai-mentor-private-real-product-10h', tier: 'Lớp riêng 1-1', name: 'Biến AI của bạn thành sản phẩm có doanh thu — 10 giờ', summary: '10 giờ tập trung đóng gói AI thành sản phẩm có doanh thu — pricing, Stripe checkout, onboarding, vận hành.', originalAmount: 1860, discountedAmount: 1400, currency: 'AUD', suffix: '/ 10 giờ', tags: ['Launch sản phẩm', 'Pricing & vận hành', 'Stripe integration'], icon: 'real-product', featured: false, customLabel: '' },
        { id: 'ai-mentor-private-project-based-builder', tier: 'Lớp riêng 1-1', name: 'Mentor theo dự án — bám sát roadmap của bạn', summary: 'Gói tuỳ chỉnh theo dự án bạn đang làm. Mentor tham gia như senior IC — sprint review, code review, ship dates.', originalAmount: null, discountedAmount: null, currency: 'AUD', customLabel: 'Tuỳ chỉnh', suffix: 'Cohort Khởi Tạo: ưu tiên intake', tags: ['Phạm vi tuỳ chỉnh', 'Senior IC', 'Theo từng sprint'], icon: 'project-builder', featured: false },
        { id: 'ai-mentor-private-ongoing-ops-support', tier: 'Lớp riêng 1-1', name: 'Mentor & vận hành liên tục — duy trì momentum', summary: 'Mentor + vận hành sản phẩm AI liên tục sau khi launch. Check-in tháng, on-demand pairing, ops escalation.', originalAmount: null, discountedAmount: null, currency: 'AUD', customLabel: 'Theo yêu cầu', suffix: 'Cohort Khởi Tạo: ưu tiên slot', tags: ['Retainer', 'Vận hành', 'Check-in tháng'], icon: 'ongoing', featured: false },
        { id: 'ai-mentor-group-first-ai-app-60', tier: 'Cohort nhóm nhỏ', name: 'Nhóm — Ứng dụng AI đầu tiên trong 60 phút', summary: 'Cùng buổi học khởi động nhanh, dành cho nhóm nhỏ. Rẻ hơn theo đầu người, kết quả như nhau.', originalAmount: 80, discountedAmount: 60, currency: 'AUD', suffix: '/ giờ / người', tags: ['Nhóm', 'Tối thiểu 5 hv', 'Cho người mới'], icon: 'first-app', featured: false, customLabel: '' },
        { id: 'ai-mentor-group-executes-for-you-5h', tier: 'Cohort nhóm nhỏ', name: 'Nhóm — AI tự vận hành công việc', summary: 'Cohort 5 giờ tự động hoá công việc cho cả team. Mỗi thành viên ship automation của riêng mình.', originalAmount: 390, discountedAmount: 290, currency: 'AUD', suffix: '/ 5 giờ / người', tags: ['Nhóm', 'Tự động hoá', 'Cohort'], icon: 'executes', featured: false, customLabel: '' },
        { id: 'ai-mentor-group-real-product-10h', tier: 'Cohort nhóm nhỏ', name: 'Nhóm — Biến AI thành sản phẩm thật', summary: 'Cohort 10 giờ tập trung ship sản phẩm AI có doanh thu. Phản hồi từ peer + mentor cấp cao.', originalAmount: 780, discountedAmount: 580, currency: 'AUD', suffix: '/ 10 giờ / người', tags: ['Nhóm', 'Launch sản phẩm', 'Cohort'], icon: 'real-product', featured: false, customLabel: '' },
        { id: 'ai-mentor-group-project-based-builder', tier: 'Cohort nhóm nhỏ', name: 'Nhóm — Mentor theo dự án', summary: 'Gói nhóm theo dự án chung cohort cùng ship. Live trên Zoho Meeting, peer review, mentor cấp cao.', originalAmount: null, discountedAmount: null, currency: 'AUD', customLabel: 'Tuỳ chỉnh', suffix: 'min 5 học viên · ưu tiên Cohort Khởi Tạo', tags: ['Nhóm', 'Tuỳ chỉnh', 'Ship dự án'], icon: 'project-builder', featured: false },
        { id: 'ai-mentor-group-ongoing-ops-support', tier: 'Cohort nhóm nhỏ', name: 'Nhóm — Mentor & vận hành liên tục', summary: 'Mentor + vận hành nhóm liên tục sau khi team ship. Cohort review hàng tháng + on-demand pairing.', originalAmount: null, discountedAmount: null, currency: 'AUD', customLabel: 'Theo yêu cầu', suffix: 'min 5 học viên · ưu tiên Cohort Khởi Tạo', tags: ['Nhóm', 'Retainer', 'Vận hành'], icon: 'ongoing', featured: false },
      ],
    },
    flow: {
      eyebrow: 'Quy trình đăng ký',
      title: 'Giữ chỗ chỉ trong 4 phút.',
      lead: 'Không form dài, không cuộc gọi sales. Chọn chương trình, thanh toán Stripe, mentor liên hệ trong 24 giờ kèm link Zoho Meeting.',
      steps: [
        { title: 'Chọn chương trình', body: 'Xem 10 chương trình bên trên. Lớp riêng 1-1 nếu cần tập trung, cohort nhóm nếu thích học cùng peer.' },
        { title: 'Chọn slot', body: 'Xác nhận liên hệ. Buổi học qua Zoho Meeting + Google Calendar, tối ngày thường hoặc cuối tuần.' },
        { title: 'Giữ chỗ', body: 'Stripe checkout — thẻ, Apple Pay hoặc Google Pay. Hoá đơn về email trước khi bạn đóng tab.' },
        { title: 'Mentor xác nhận trong 24 giờ', body: 'Tin nhắn cá nhân qua Telegram hoặc WhatsApp + Google Calendar invite + link Zoho Meeting trong inbox.' },
      ],
    },
    trust: {
      eyebrow: 'Vì sao học viên chọn chúng tôi',
      title: 'Người làm thật. Kết quả thật. Bảo vệ thật.',
      items: [
        { icon: 'shield', title: 'Hoàn tiền 7 ngày', body: 'Nếu buổi đầu không phù hợp, chúng tôi hoàn tiền — không hỏi, không phiền hà.' },
        { icon: 'sparkle', title: 'Senior practitioner, không phải KOL', body: 'Mentor là senior engineer đang ship sản phẩm AI từ 2018. Codebase thật, kết quả thật.' },
        { icon: 'globe', title: '100% online · song ngữ EN / VI', body: 'Zoho Meeting trên mọi laptop. Buổi học, follow-up, ghi chú EN hoặc VI. Đổi ngôn ngữ bất cứ lúc nào.' },
        { icon: 'lock', title: 'Thanh toán Stripe an toàn', body: 'Hoá đơn ngay, hoàn tiền khi yêu cầu, không phụ phí bất ngờ. Cùng cổng thanh toán Apple, Spotify, Shopify.' },
      ],
    },
    testimonials: {
      eyebrow: 'Học viên đã làm được',
      title: 'Họ đã xây gì — bằng chính lời họ.',
      lead: 'Kết quả thật từ học viên thật. Tên đã rút gọn để bảo mật.',
      items: [
        { quote: 'Tôi ship được app AI đầu tiên ngay ngày 1. Hai tuần sau nó đã chạy production cho team — tiết kiệm 6 giờ phân loại mỗi tuần.', name: 'Linh N.', role: 'Product Manager · SaaS', program: 'AI tự vận hành công việc — 5 giờ', initials: 'LN', gradientA: '#14a092', gradientB: '#0f5c54' },
        { quote: 'Bọn mình xây agent phân loại email, tiết kiệm 8 giờ/tuần cho mình. Khoá học hoàn vốn ngay tháng đầu. Đang tiếp tục track "real product".', name: 'Mark T.', role: 'Founder · startup 2 người', program: 'AI tự vận hành · sau đó Real product', initials: 'MT', gradientA: '#ff6b3d', gradientB: '#e84e1e' },
        { quote: 'Từ 0 kinh nghiệm AI tới launch side-product kiếm $400/tháng trong 90 ngày. Mentor đi cùng từ prototype đến Stripe checkout.', name: 'Anh P.', role: 'Engineer · weekend builder', program: 'Real product — 10 giờ', initials: 'AP', gradientA: '#94e8d2', gradientB: '#1bc7b3' },
      ],
    },
    register: {
      eyebrow: 'Chưa biết chương trình nào phù hợp?',
      title: 'Nói với chúng tôi 30 giây. Mentor liên hệ trong 24 giờ.',
      lead: 'Để lại liên hệ + chương trình bạn quan tâm. Mentor sẽ nhắn cá nhân qua Telegram, WhatsApp hoặc email — không có drip tự động.',
      fields: { fullName: 'Họ và tên', email: 'Email', phone: 'Số điện thoại (ưu tiên Telegram / WhatsApp)', program: 'Chương trình quan tâm', message: 'Bạn muốn xây gì với AI?' },
      placeholders: { fullName: 'VD: Nguyễn Linh', email: 'ban@email.com', phone: '+84 / +61 …', message: 'Mô tả ngắn 1 dòng về sản phẩm hoặc workflow AI bạn muốn xây.' },
      programChoose: 'Chọn chương trình',
      consent: 'Khi gửi form, bạn đồng ý cho team AI Mentor liên hệ về yêu cầu này. Có thể huỷ đăng ký bất cứ lúc nào.',
      submit: 'Gửi quan tâm',
      submitting: 'Đang gửi…',
      success: { title: 'Đã ghi nhận — mentor sẽ liên hệ trong 24 giờ.', body: 'Hãy kiểm tra email và Telegram / WhatsApp để nhận tin nhắn đầu tiên. Bạn cũng có thể chọn slot trực tiếp ở khung chat phía trên.', cta: 'Chọn slot ngay' },
      error: 'Không gửi được yêu cầu. Vui lòng thử lại — hoặc nhắn Telegram / WhatsApp.',
    },
    faq: {
      eyebrow: 'Câu hỏi thường gặp',
      title: 'Mọi thứ học viên muốn biết trước khi giữ chỗ.',
      items: [
        { q: 'Buổi học trực tiếp hay online?', a: '100% online. Mọi buổi chạy trên Zoho Meeting (HD, share màn hình, tự ghi hình bạn giữ). Sau khi mentor xác nhận, bạn nhận Google Calendar invite + file .ics qua email.' },
        { q: 'Tôi có cần biết lập trình không?', a: 'Không. Chương trình "Ứng dụng AI đầu tiên trong 60 phút" dành cho người không có nền tảng kỹ thuật — bạn ra về với prototype AI dùng công cụ no-code/low-code. Chương trình "Real product" sẽ đi sâu vào code.' },
        { q: 'Buổi học bằng tiếng Anh hay tiếng Việt?', a: 'Cả hai. Email follow-up, Telegram và WhatsApp đều hỗ trợ EN / VI. Bạn đổi ngôn ngữ trang web ở đầu trang bất cứ lúc nào.' },
        { q: 'Tôi thanh toán thế nào?', a: 'Stripe checkout an toàn. Hỗ trợ thẻ, Apple Pay, Google Pay. Hoá đơn về email ngay lập tức.' },
        { q: 'Nếu buổi đầu không phù hợp thì sao?', a: 'Hoàn tiền 7 ngày. Nếu không hợp, chúng tôi hoàn tiền — không hỏi, không phiền hà.' },
        { q: 'Tôi có thể đổi lịch không?', a: 'Có. Dùng link trong email booking để đổi lịch, tạm dừng hoặc downgrade. Hoặc nhắn mentor qua Telegram / WhatsApp.' },
        { q: 'Cohort Khởi Tạo là gì?', a: '50 học viên đầu tiên đăng ký được giảm 25% mọi gói niêm yết và đồng hành với chúng tôi định hình curriculum. Tới hết 31/05/2026 hoặc đủ 50 ghế — tuỳ điều kiện nào đến trước.' },
        { q: 'Bao lâu thì thấy kết quả?', a: 'Đa số học viên rời buổi 1 đã có prototype AI có thể demo. Tới buổi thứ 3 thường đã có automation chạy giúp bạn. Doanh thu thật từ side-product thường đến trong 60–90 ngày.' },
      ],
    },
    channels: { title: 'Trao đổi với mentor qua kênh của bạn', lead: 'Chọn kênh bạn đang dùng. Mentor sẽ tiếp tục cùng thread đó — không ticket, không chờ.', telegram: 'Tiếp tục qua Telegram', whatsapp: 'Tiếp tục qua WhatsApp', email: 'Email cho mentor' },
    quickPrompts: [
      'Tôi muốn buổi 1-1 để xây ứng dụng AI đầu tiên trong 1 giờ.',
      'Giúp tôi chọn gói để tự động hoá công việc thật bằng AI.',
      'Tôi cần mentor theo dự án cho team.',
      'Tôi muốn biến prototype AI của mình thành sản phẩm có doanh thu.',
    ],
    finalCta: {
      eyebrow: 'Sẵn sàng ship?',
      title: 'Sản phẩm AI đầu tiên của bạn chỉ cách một buổi Zoho Meeting.',
      lead: 'Giữ chỗ Cohort Khởi Tạo ngay — giảm 25% tới hết 31/05. Nếu buổi đầu không phù hợp, hoàn tiền trong 7 ngày.',
      primary: 'Giữ chỗ — giảm 25% →',
      secondary: 'Trao đổi với mentor trước',
      moneyBack: 'Hoàn tiền 7 ngày',
      bilingual: 'Buổi học EN hoặc VI',
      bookFast: 'Mentor phản hồi trong 24 giờ',
    },
    stickyCta: { lead: 'Cohort Khởi Tạo -25%', cta: 'Giữ chỗ' },
    footer: {
      tagline: 'Mentor AI cấp cao. Lớp 1-1 và cohort nhóm nhỏ trên Zoho Meeting. Kết quả thật — không slide.',
      links: { programs: 'Chương trình', profile: 'Hồ sơ mentor', howItWorks: 'Quy trình', results: 'Học viên', faq: 'Hỏi đáp', login: 'Học viên' },
      contactTitle: 'Liên hệ mentor',
      legal: '© AI Mentor 1-1 Pro. Mọi quyền được bảo lưu.',
    },
    feedback: {
      title: 'Buổi học AI Mentor của bạn thế nào?',
      bookingMissing: 'Thiếu mã booking',
      bookingMissingBody: 'Vui lòng mở link feedback từ email AI Mentor để nạp đúng booking.',
      ratingLegend: 'Đánh giá',
      commentLabel: 'Bình luận (tuỳ chọn)',
      commentPlaceholder: 'Điều gì hiệu quả? Mentor có thể cải thiện gì cho buổi sau?',
      recommend: 'Tôi sẵn sàng giới thiệu AI Mentor cho bạn bè.',
      sendCta: 'Gửi phản hồi',
      sending: 'Đang gửi…',
      successTitle: 'Cảm ơn phản hồi của bạn.',
      successBodyPrefix: 'Đã ghi nhận cho booking ',
      successBodySuffix: '. Mentor sẽ thấy trước buổi học tiếp theo.',
      openBooking: 'Mở booking',
      missingError: 'Cần mã booking để gửi phản hồi.',
      genericError: 'Không lưu được phản hồi. Vui lòng thử lại.',
      networkError: 'Không kết nối được. Thử lại sau.',
    },
  },
};

type Dict = (typeof dict)[Locale];
type Program = Dict['catalog']['programs'][number];

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'vi') return stored;
  } catch {
    /* ignore */
  }
  return 'en';
}

function persistLocale(locale: Locale) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

function parseQueryState() {
  if (typeof window === 'undefined') {
    return { initialQuery: null as string | null, isFeedback: false, feedbackBookingReference: null as string | null, feedbackToken: null as string | null };
  }
  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q')?.trim() || null;
  const isFeedback = window.location.pathname === '/feedback' || window.location.pathname === '/aimentor/feedback' || window.location.pathname.startsWith('/aimentor/feedback');
  const feedbackBookingReference = params.get('booking_reference')?.trim() || null;
  const feedbackToken = params.get('token')?.trim() || null;
  return { initialQuery, isFeedback, feedbackBookingReference, feedbackToken };
}

function formatPrice(amount: number, currency: string) {
  if (Number.isInteger(amount)) return `${currency} $${amount.toLocaleString('en-US')}`;
  return `${currency} $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------- Inline SVG icons + illustrations ------------------------

function BrandMark({ size = 22 }: { size?: number }) {
  // AI Mentor 1-on-1 brand mark: hexagonal node with two connected circles
  // representing the mentor + student dyad, plus a coral spark for "active".
  // Uses currentColor for the fill so the mark adopts header text colour.
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="aim-brand-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1bc7b3" />
          <stop offset="100%" stopColor="#0f5c54" />
        </linearGradient>
      </defs>
      <path d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z" fill="url(#aim-brand-bg)" stroke="#94e8d2" strokeWidth="0.6" strokeOpacity="0.45" />
      <circle cx="11.5" cy="16" r="3" fill="#94e8d2" />
      <circle cx="20.5" cy="16" r="3" fill="#ff6b3d" />
      <path d="M14.5 16 L17.5 16" stroke="#fdfaf3" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16.4 14.6 L17.8 16 L16.4 17.4" stroke="#fdfaf3" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24.2" cy="8.5" r="1.4" fill="#94e8d2" opacity="0.9" />
      <circle cx="24.2" cy="8.5" r="1.4" fill="#94e8d2" opacity="0.5">
        <animate attributeName="r" values="1.4;2.6;1.4" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function MentorPortraitIcon() {
  return (
    <svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="aim-mentor-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0f5c54" /><stop offset="100%" stopColor="#061614" /></linearGradient>
        <linearGradient id="aim-mentor-glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#94e8d2" stopOpacity="0.85" /><stop offset="100%" stopColor="#14a092" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="120" height="150" rx="14" fill="url(#aim-mentor-bg)" />
      <g opacity="0.18">{Array.from({ length: 8 }).map((_, i) => (<line key={`h-${i}`} x1="0" x2="120" y1={20 + i * 16} y2={20 + i * 16} stroke="#94e8d2" strokeWidth="0.5" />))}{Array.from({ length: 8 }).map((_, i) => (<line key={`v-${i}`} x1={15 + i * 12} x2={15 + i * 12} y1="0" y2="150" stroke="#94e8d2" strokeWidth="0.5" />))}</g>
      <circle cx="60" cy="130" r="50" fill="url(#aim-mentor-glow)" opacity="0.7" />
      <circle cx="60" cy="58" r="22" fill="#14a092" opacity="0.9" />
      <circle cx="60" cy="58" r="22" stroke="#94e8d2" strokeWidth="1" />
      <path d="M22 130 C22 102, 38 88, 60 88 C82 88, 98 102, 98 130 L98 150 L22 150 Z" fill="#14a092" opacity="0.9" />
      <circle cx="92" cy="32" r="6" fill="#ff6b3d" />
      <circle cx="92" cy="32" r="6" fill="#ff6b3d" opacity="0.4"><animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" /></circle>
    </svg>
  );
}

function OutcomeIcon({ kind }: { kind: 'build' | 'automate' | 'earn' }) {
  if (kind === 'build') return (<svg viewBox="0 0 48 48" width={48} height={48} xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true"><defs><linearGradient id="aim-icon-build" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#14a092" /><stop offset="100%" stopColor="#0f5c54" /></linearGradient></defs><rect x="2" y="2" width="44" height="44" rx="12" fill="url(#aim-icon-build)" /><path d="M14 28 L20 22 L14 16" stroke="#fdfaf3" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M22 30 L34 30" stroke="#fdfaf3" strokeWidth="2.4" strokeLinecap="round" /><circle cx="36" cy="14" r="3" fill="#ff6b3d" /></svg>);
  if (kind === 'automate') return (<svg viewBox="0 0 48 48" width={48} height={48} xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true"><defs><linearGradient id="aim-icon-auto" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#1bc7b3" /><stop offset="100%" stopColor="#14a092" /></linearGradient></defs><rect x="2" y="2" width="44" height="44" rx="12" fill="url(#aim-icon-auto)" /><circle cx="24" cy="24" r="6" stroke="#fdfaf3" strokeWidth="2.4" fill="none" /><path d="M24 12 V8 M24 40 V36 M12 24 H8 M40 24 H36 M32.5 15.5 L35 13 M13 35 L15.5 32.5 M32.5 32.5 L35 35 M13 13 L15.5 15.5" stroke="#fdfaf3" strokeWidth="2.2" strokeLinecap="round" /></svg>);
  return (<svg viewBox="0 0 48 48" width={48} height={48} xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true"><defs><linearGradient id="aim-icon-earn" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff6b3d" /><stop offset="100%" stopColor="#e84e1e" /></linearGradient></defs><rect x="2" y="2" width="44" height="44" rx="12" fill="url(#aim-icon-earn)" /><path d="M14 32 L20 24 L26 28 L34 16" stroke="#fdfaf3" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" /><circle cx="34" cy="16" r="2.4" fill="#fdfaf3" /></svg>);
}

function ProgramIllustration({ kind, uid }: { kind: 'first-app' | 'executes' | 'real-product' | 'project-builder' | 'ongoing'; uid: string }) {
  const id = `aim-prog-${uid}`;
  const teal = '#14a092'; const tealDeep = '#0f5c54'; const mint = '#94e8d2'; const coral = '#ff6b3d'; const ink = '#0a1f1c'; const cream = '#fdfaf3';
  const baseStyle = { width: '100%', height: 'auto', display: 'block' as const };

  if (kind === 'first-app') return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={baseStyle}>
      <defs><linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={mint} stopOpacity="0.18" /><stop offset="100%" stopColor={teal} stopOpacity="0.08" /></linearGradient></defs>
      <rect width="200" height="120" fill={`url(#${id}-bg)`} />
      <rect x="46" y="22" width="108" height="64" rx="6" fill={ink} />
      <rect x="50" y="26" width="100" height="56" rx="3" fill={cream} />
      <rect x="58" y="34" width="38" height="3" rx="1.5" fill={tealDeep} />
      <rect x="58" y="42" width="58" height="3" rx="1.5" fill={teal} opacity="0.6" />
      <rect x="58" y="50" width="46" height="3" rx="1.5" fill={teal} opacity="0.6" />
      <rect x="58" y="58" width="68" height="3" rx="1.5" fill={teal} opacity="0.6" />
      <rect x="58" y="66" width="32" height="3" rx="1.5" fill={tealDeep} />
      <circle cx="138" cy="44" r="14" fill={coral} opacity="0.18" />
      <path d="M138 34 L141 42 L149 44 L141 46 L138 54 L135 46 L127 44 L135 42 Z" fill={coral} />
      <rect x="38" y="86" width="124" height="6" rx="3" fill={ink} />
      <ellipse cx="100" cy="100" rx="60" ry="6" fill={teal} opacity="0.12" />
      <rect x="14" y="14" width="44" height="16" rx="8" fill={tealDeep} />
      <text x="36" y="25" textAnchor="middle" fill={mint} fontSize="9" fontFamily="monospace" fontWeight="700">60 MIN</text>
    </svg>
  );

  if (kind === 'executes') return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={baseStyle}>
      <defs><linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={mint} stopOpacity="0.16" /><stop offset="100%" stopColor={teal} stopOpacity="0.06" /></linearGradient></defs>
      <rect width="200" height="120" fill={`url(#${id}-bg)`} />
      <rect x="14" y="48" width="44" height="24" rx="6" fill={cream} stroke={tealDeep} strokeWidth="1.5" />
      <text x="36" y="63" textAnchor="middle" fill={tealDeep} fontSize="9" fontWeight="700" fontFamily="monospace">INPUT</text>
      <path d="M62 60 L78 60" stroke={teal} strokeWidth="2" />
      <circle cx="92" cy="60" r="16" fill={teal} />
      <path d="M85 60 L91 66 L99 56" stroke={cream} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M108 60 L124 60" stroke={teal} strokeWidth="2" />
      <rect x="128" y="48" width="56" height="24" rx="6" fill={coral} />
      <text x="156" y="63" textAnchor="middle" fill={cream} fontSize="9" fontWeight="700" fontFamily="monospace">OUTPUT</text>
      <circle cx="170" cy="22" r="10" stroke={tealDeep} strokeWidth="1.5" fill="none" />
      <rect x="14" y="90" width="84" height="18" rx="9" fill={tealDeep} />
      <text x="56" y="102" textAnchor="middle" fill={mint} fontSize="9" fontFamily="monospace" fontWeight="700">SAVES 5–10 HRS/WK</text>
    </svg>
  );

  if (kind === 'real-product') return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={baseStyle}>
      <defs><linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={coral} stopOpacity="0.16" /><stop offset="100%" stopColor={mint} stopOpacity="0.08" /></linearGradient></defs>
      <rect width="200" height="120" fill={`url(#${id}-bg)`} />
      <path d="M50 32 L100 22 L150 32 L150 80 L100 90 L50 80 Z" fill={teal} />
      <path d="M50 32 L100 42 L150 32" stroke={mint} strokeWidth="1.5" fill="none" />
      <path d="M100 42 L100 90" stroke={mint} strokeWidth="1.5" />
      <path d="M30 96 L60 86 L90 80 L120 70 L150 56 L172 44" stroke={coral} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="172" cy="44" r="4" fill={coral} />
      <circle cx="100" cy="56" r="14" fill={cream} stroke={tealDeep} strokeWidth="1.5" />
      <text x="100" y="60" textAnchor="middle" fill={tealDeep} fontSize="13" fontWeight="700" fontFamily="'Space Grotesk', sans-serif">$</text>
      <rect x="14" y="14" width="64" height="16" rx="8" fill={coral} />
      <text x="46" y="25" textAnchor="middle" fill={cream} fontSize="9" fontFamily="monospace" fontWeight="700">MONETISE</text>
    </svg>
  );

  if (kind === 'project-builder') return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={baseStyle}>
      <defs><linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={mint} stopOpacity="0.14" /><stop offset="100%" stopColor={tealDeep} stopOpacity="0.06" /></linearGradient></defs>
      <rect width="200" height="120" fill={`url(#${id}-bg)`} />
      <rect x="20" y="16" width="160" height="88" rx="6" fill={cream} stroke={tealDeep} strokeWidth="1.5" />
      <rect x="32" y="30" width="32" height="22" rx="2" fill={coral} />
      <rect x="72" y="30" width="32" height="22" rx="2" fill={teal} />
      <rect x="112" y="30" width="32" height="22" rx="2" fill={mint} />
      <rect x="32" y="60" width="32" height="22" rx="2" fill={teal} />
      <rect x="72" y="60" width="64" height="22" rx="2" fill={tealDeep} />
      <rect x="144" y="60" width="24" height="22" rx="2" fill={coral} />
      <rect x="14" y="92" width="60" height="16" rx="8" fill={tealDeep} />
      <text x="44" y="103" textAnchor="middle" fill={mint} fontSize="9" fontFamily="monospace" fontWeight="700">SPRINT-BASED</text>
    </svg>
  );

  return (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={baseStyle}>
      <defs><linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={teal} stopOpacity="0.14" /><stop offset="100%" stopColor={cream} stopOpacity="0.6" /></linearGradient></defs>
      <rect width="200" height="120" fill={`url(#${id}-bg)`} />
      <rect x="50" y="22" width="100" height="76" rx="6" fill={cream} stroke={tealDeep} strokeWidth="1.5" />
      <rect x="50" y="22" width="100" height="14" rx="6" fill={tealDeep} />
      <text x="100" y="33" textAnchor="middle" fill={mint} fontSize="9" fontFamily="monospace" fontWeight="700">MONTHLY</text>
      {[0, 1, 2].map((row) => [0, 1, 2, 3].map((col) => {
        const x = 60 + col * 22;
        const y = 46 + row * 16;
        const isFilled = (row + col) % 2 === 0;
        return (
          <g key={`${row}-${col}`}>
            <rect x={x} y={y} width="14" height="10" rx="2" fill={isFilled ? teal : cream} stroke={teal} strokeWidth="1" />
            {isFilled ? <path d={`M${x + 3} ${y + 5} L${x + 6} ${y + 8} L${x + 11} ${y + 3}`} stroke={cream} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
          </g>
        );
      }))}
      <rect x="14" y="92" width="60" height="16" rx="8" fill={coral} />
      <text x="44" y="103" textAnchor="middle" fill={cream} fontSize="9" fontFamily="monospace" fontWeight="700">RETAINER</text>
    </svg>
  );
}

function TrustBadgeIcon({ kind }: { kind: 'shield' | 'sparkle' | 'globe' | 'lock' }) {
  const common = { width: 36, height: 36, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 as number, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'shield') return (<svg {...common} aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" /><path d="m9 12 2 2 4-4" /></svg>);
  if (kind === 'sparkle') return (<svg {...common} aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M16.3 7.7l2.1-2.1M5.6 18.4l2.1-2.1" /><circle cx="12" cy="12" r="3" /></svg>);
  if (kind === 'globe') return (<svg {...common} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" /></svg>);
  return (<svg {...common} aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /><circle cx="12" cy="16" r="1.2" fill="currentColor" /></svg>);
}

function MoneyBackBadge({ label }: { label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(47, 158, 117, 0.14)', color: '#2f9e75', border: '1px solid rgba(47, 158, 117, 0.32)', borderRadius: 999, fontSize: '0.82rem', fontWeight: 600 }}>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" /><path d="m9 12 2 2 4-4" /></svg>
      {label}
    </span>
  );
}

function TestimonialAvatar({ initials, gradientA, gradientB, id }: { initials: string; gradientA: string; gradientB: string; id: string }) {
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><linearGradient id={`aim-avatar-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={gradientA} /><stop offset="100%" stopColor={gradientB} /></linearGradient></defs>
      <circle cx="24" cy="24" r="24" fill={`url(#aim-avatar-${id})`} />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fill="#fdfaf3" fontFamily="'Space Grotesk', Inter, sans-serif" fontWeight={700} fontSize="18">{initials}</text>
    </svg>
  );
}

function StarRow() {
  return (<span style={{ display: 'inline-flex', gap: 2, color: '#ff6b3d' }} aria-label="5 out of 5 stars">{[0, 1, 2, 3, 4].map((i) => (<svg key={i} width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6L12 2z" /></svg>))}</span>);
}

// ---------------- Promo banner with countdown -----------------------------

function useCountdown(targetIso: string) {
  const target = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { days, hours, minutes, expired: diff <= 0 };
}

function PromoBanner({ t }: { t: Dict }) {
  const cd = useCountdown(PROMO_DEADLINE_ISO);
  if (cd.expired) return null;
  return (
    <div role="region" aria-label="Founding Cohort promotion" style={{ background: 'linear-gradient(135deg, #ff6b3d 0%, #e84e1e 100%)', color: '#fdfaf3', padding: '10px 16px', textAlign: 'center', fontFamily: 'var(--aim-font-body)', fontSize: '0.88rem', fontWeight: 500, position: 'sticky', top: 0, zIndex: 50, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 12px rgba(232, 78, 30, 0.25)' }}>
      <span style={{ fontFamily: 'var(--aim-font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.95 }}>{t.promo.eyebrow}</span>
      <strong style={{ fontWeight: 700, fontSize: '0.92rem' }}>{t.promo.headline}</strong>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.18)', fontFamily: 'var(--aim-font-mono)', fontSize: '0.78rem', fontWeight: 600 }}>{t.promo.countdownPrefix}: {cd.days}{t.promo.countdownDays} {cd.hours}{t.promo.countdownHours} {cd.minutes}{t.promo.countdownMinutes}</span>
      <a href="#programs" style={{ background: '#fdfaf3', color: '#e84e1e', padding: '6px 14px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.84rem' }}>{t.promo.bookCta}</a>
    </div>
  );
}

// ---------------- Sections ------------------------------------------------

function LanguageToggle({ locale, onChange, label, enLabel, viLabel }: { locale: Locale; onChange: (next: Locale) => void; label: string; enLabel: string; viLabel: string }) {
  return (
    <div className="aim-lang-toggle" role="group" aria-label={label}>
      <button type="button" className="aim-lang-option" aria-pressed={locale === 'en'} onClick={() => onChange('en')}>{enLabel}</button>
      <button type="button" className="aim-lang-option" aria-pressed={locale === 'vi'} onClick={() => onChange('vi')}>{viLabel}</button>
    </div>
  );
}

function TopNav({ t, locale, onLocaleChange }: { t: Dict; locale: Locale; onLocaleChange: (next: Locale) => void }) {
  return (
    <nav className="aim-nav" aria-label="Primary">
      <div className="aim-container aim-nav-inner">
        <a className="aim-brand" href="/aimentor" aria-label={t.nav.brandName}>
          <span className="aim-brand-mark"><BrandMark size={22} /></span>
          <span className="aim-brand-text">
            <span className="aim-brand-name">{t.nav.brandName}</span>
            <span className="aim-brand-tag">{t.nav.brandTag}</span>
          </span>
        </a>
        <div className="aim-nav-links">
          <a className="aim-nav-link" href="#programs">{t.nav.programs}</a>
          <a className="aim-nav-link" href="#mentor">{t.nav.profile}</a>
          <a className="aim-nav-link" href="#how-it-works">{t.nav.howItWorks}</a>
          <a className="aim-nav-link" href="#results">{t.nav.results}</a>
          <a className="aim-nav-link" href="#faq">{t.nav.faq}</a>
        </div>
        <div className="aim-nav-actions">
          <LanguageToggle locale={locale} onChange={onLocaleChange} label={t.languageToggle.label} enLabel={t.languageToggle.en} viLabel={t.languageToggle.vi} />
          <a className="aim-btn aim-btn-secondary aim-btn-sm" href={PORTAL_BASE_URL}>{t.nav.studentLogin}</a>
          <a className="aim-btn aim-btn-primary aim-btn-sm" href="#programs">{t.nav.enroll}</a>
        </div>
      </div>
    </nav>
  );
}

function Hero({ t, onPrompt, initialQuery, initialQueryRequestId }: { t: Dict; onPrompt: (prompt: string) => void; initialQuery: string | null; initialQueryRequestId: number }) {
  return (
    <section className="aim-hero">
      <div className="aim-container">
        <div className="aim-hero-grid">
          <div>
            <p className="aim-eyebrow aim-eyebrow-on-dark">{t.hero.eyebrow}</p>
            <h1 className="aim-hero-title" style={{ marginTop: 14 }}>{t.hero.titleLeft}<em>{t.hero.titleEm}</em>{t.hero.titleRight}</h1>
            <p className="aim-hero-lead" style={{ marginTop: 20 }}>{t.hero.lead}</p>
            <div className="aim-hero-cta">
              <a className="aim-btn aim-btn-primary aim-btn-lg" href="#programs">{t.hero.reserveCta}</a>
              <a className="aim-btn aim-btn-secondary aim-btn-lg" href="#assistant">{t.hero.chatCta}</a>
            </div>
            <div className="aim-hero-trust">
              {t.hero.trustChips.map((chip, idx) => (<span key={chip} className={`aim-trust-chip${idx % 2 === 1 ? ' aim-trust-chip-coral' : ''}`}>{chip}</span>))}
            </div>
            <div className="aim-hero-stats" style={{ marginTop: 32 }}>
              {t.hero.statValues.map((stat) => (<div key={stat.label} className="aim-hero-stat"><div className="aim-hero-stat-value">{stat.value}</div><div className="aim-hero-stat-label">{stat.label}</div></div>))}
            </div>
          </div>
          <div id="assistant" className="aim-mentor-card">
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5', borderRadius: 'var(--aim-radius-lg)', overflow: 'hidden', border: '1px solid rgba(148, 232, 210, 0.2)' }}>
              <MentorPortraitIcon />
              <span style={{ position: 'absolute', top: 12, left: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(6, 22, 20, 0.6)', color: '#94e8d2', fontFamily: 'var(--aim-font-mono)', fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(148, 232, 210, 0.32)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: '#94e8d2', boxShadow: '0 0 6px #94e8d2' }} />
                {t.hero.mentorOnline}
              </span>
            </div>
            <div className="aim-eyebrow aim-eyebrow-on-dark" style={{ marginTop: 18 }}>{t.hero.mentorCardTag}</div>
            <div className="aim-mentor-name">{t.hero.mentorName}</div>
            <div className="aim-mentor-meta">{t.hero.mentorMeta}</div>
            <div className="aim-mentor-quote">{t.hero.mentorQuote}</div>
            <div style={{ marginTop: 18, padding: 14, borderRadius: 'var(--aim-radius)', background: 'rgba(148, 232, 210, 0.06)', border: '1px solid rgba(148, 232, 210, 0.12)' }}>
              <div style={{ fontFamily: 'var(--aim-font-mono)', fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--aim-mint)', marginBottom: 8 }}>{t.hero.sessionPreviewTag}</div>
              {t.hero.sessionPreviewLines.map((line) => (<div key={line} style={{ fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--aim-on-dark-muted)', paddingLeft: 16, position: 'relative', marginBottom: 6 }}><span style={{ position: 'absolute', left: 0, color: 'var(--aim-coral)', fontWeight: 700 }}>→</span>{line}</div>))}
            </div>
            <div className="aim-concierge-prompts" style={{ marginTop: 14 }}>
              {t.quickPrompts.map((prompt) => (<button key={prompt} type="button" className="aim-concierge-prompt" onClick={() => onPrompt(prompt)}>{prompt}</button>))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 36, maxWidth: 720, marginInline: 'auto', position: 'relative', zIndex: 2 }}>
          <BookingAssistantDialog content={bookingAssistantContent} isOpen standalone embedded hideCloseControl layoutMode="product_app" closeLabel={t.nav.brandName} entrySourcePath="/aimentor" initialQuery={initialQuery} initialQueryRequestId={initialQueryRequestId} runtimeConfig={aiMentorBookedAIRuntimeConfig} onClose={() => {}} />
        </div>
      </div>
    </section>
  );
}

function OutcomesBlock({ t }: { t: Dict }) {
  return (
    <section className="aim-section aim-section-paper">
      <div className="aim-container">
        <header className="aim-section-header">
          <span className="aim-eyebrow">{t.outcomes.eyebrow}</span>
          <h2 className="aim-section-title">{t.outcomes.title}</h2>
          <p className="aim-section-lead">{t.outcomes.lead}</p>
        </header>
        <div className="aim-grid-3">
          {t.outcomes.items.map((item) => (
            <div key={item.title} className="aim-card-flat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: 28, height: '100%' }}>
              <OutcomeIcon kind={item.icon as 'build' | 'automate' | 'earn'} />
              <div style={{ fontFamily: 'var(--aim-font-mono)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--aim-coral)', marginTop: 16 }}>{item.tag}</div>
              <h3 style={{ fontFamily: 'var(--aim-font-display)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.015em', color: 'var(--aim-ink)', marginTop: 6 }}>{item.title}</h3>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.65, color: 'var(--aim-muted)', marginTop: 10 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MentorProfile({ t }: { t: Dict }) {
  return (
    <section id="mentor" className="aim-section aim-section-tinted">
      <div className="aim-container">
        <div className="aim-split">
          <div>
            <span className="aim-eyebrow">{t.profile.eyebrow}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
              <span style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #14a092 0%, #0f5c54 100%)', color: '#fdfaf3', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--aim-font-display)', fontWeight: 700, fontSize: '1.45rem', letterSpacing: '-0.02em' }}>LV</span>
              <div>
                <div style={{ fontFamily: 'var(--aim-font-display)', fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.015em', color: 'var(--aim-ink)' }}>{t.profile.name}</div>
                <a href={t.profile.linkedinUrl} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--aim-font-mono)', fontSize: '0.78rem', color: 'var(--aim-teal-deep)', textDecoration: 'none', letterSpacing: '0.04em' }}>linkedin.com/{t.profile.handle}</a>
              </div>
            </div>
            <h2 className="aim-section-title" style={{ marginTop: 14, fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>{t.profile.title}</h2>
            <p style={{ marginTop: 14, fontSize: '1rem', lineHeight: 1.7, color: 'var(--aim-text)' }}>{t.profile.bio}</p>
            <div style={{ marginTop: 22 }}>
              <h3 style={{ fontFamily: 'var(--aim-font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--aim-teal-deep)', marginBottom: 10 }}>{t.profile.credentialsTitle}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {t.profile.credentials.map((c) => (<li key={c} style={{ fontSize: '0.94rem', lineHeight: 1.55, color: 'var(--aim-text)', paddingLeft: 22, position: 'relative' }}><span style={{ position: 'absolute', left: 0, top: 0, color: 'var(--aim-coral)', fontWeight: 700 }}>→</span>{c}</li>))}
              </ul>
            </div>
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontFamily: 'var(--aim-font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--aim-teal-deep)', marginBottom: 12 }}>{t.profile.experienceTitle}</h3>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
                {t.profile.experience.map((exp) => (
                  <li key={`${exp.period}-${exp.org}`} style={{ paddingLeft: 22, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: 6, width: 10, height: 10, borderRadius: 999, background: 'var(--aim-coral)', boxShadow: '0 0 0 4px rgba(255, 107, 61, 0.16)' }} />
                    <div style={{ fontFamily: 'var(--aim-font-mono)', fontSize: '0.74rem', fontWeight: 600, color: 'var(--aim-coral)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{exp.period}</div>
                    <div style={{ fontFamily: 'var(--aim-font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--aim-ink)', marginTop: 4 }}>{exp.role} · <span style={{ color: 'var(--aim-teal-deep)' }}>{exp.org}</span></div>
                    <p style={{ marginTop: 6, fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--aim-muted)' }}>{exp.bullet}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontFamily: 'var(--aim-font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--aim-teal-deep)', marginBottom: 10 }}>{t.profile.skillsTitle}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {t.profile.skills.map((skill) => (
                  <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', background: 'rgba(20, 160, 146, 0.08)', color: 'var(--aim-teal-deep)', border: '1px solid rgba(20, 160, 146, 0.22)', borderRadius: 999, fontFamily: 'var(--aim-font-mono)', fontSize: '0.74rem', fontWeight: 600 }}>{skill}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
              <a className="aim-btn aim-btn-primary" href="#programs">{t.profile.ctaPrimary}</a>
              <a className="aim-btn aim-btn-outline" href="#assistant">{t.profile.ctaSecondary}</a>
              <a className="aim-btn aim-btn-ghost" href={t.profile.linkedinUrl} target="_blank" rel="noreferrer">{t.profile.linkedinCta}</a>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="aim-card" style={{ padding: 28 }}>
              <h3 style={{ fontFamily: 'var(--aim-font-display)', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.015em', color: 'var(--aim-ink)', marginBottom: 16 }}>{t.profile.includedTitle}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {t.profile.included.map((item, idx) => (
                  <li key={item} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ flex: '0 0 auto', width: 24, height: 24, borderRadius: 6, background: idx % 2 === 0 ? 'rgba(20, 160, 146, 0.14)' : 'rgba(255, 107, 61, 0.14)', color: idx % 2 === 0 ? 'var(--aim-teal-deep)' : 'var(--aim-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--aim-font-mono)', fontSize: '0.7rem', fontWeight: 700 }}>{idx + 1}</span>
                    <span style={{ fontSize: '0.92rem', lineHeight: 1.55, color: 'var(--aim-text)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="aim-card-tinted" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--aim-font-display)', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.015em', color: 'var(--aim-ink)', marginBottom: 12 }}>{t.profile.projectsTitle}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {t.profile.projects.map((p) => (
                  <a key={p.name} href={p.url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: 14, background: 'var(--aim-paper)', border: '1px solid var(--aim-line)', borderRadius: 12, textDecoration: 'none' }}>
                    <div style={{ fontFamily: 'var(--aim-font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--aim-ink)' }}>{p.name} <span style={{ fontFamily: 'var(--aim-font-mono)', fontSize: '0.7rem', color: 'var(--aim-teal-deep)', marginLeft: 6 }}>↗</span></div>
                    <p style={{ marginTop: 6, fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--aim-muted)' }}>{p.description}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------- TimeSlotPicker (per-program time grid) ------------------

type TimeSlot = {
  id: string;
  service_id: string;
  slot_start_at: string;
  slot_end_at: string;
  timezone: string;
  capacity: number;
  booked_count: number;
  seats_available: number;
  label: string | null;
  zoho_meeting_url: string | null;
};

const slotPickerCopy = {
  en: {
    pickTime: 'Pick a time',
    hide: 'Hide times',
    loading: 'Loading available slots…',
    empty: 'No open slots — DM the mentor on Telegram or WhatsApp for a custom time.',
    error: 'Could not load slots — please retry.',
    seatsLeft: (n: number) => `${n} seat${n === 1 ? '' : 's'} left`,
    bookThis: 'Book this slot →',
    reserveTitle: 'Reserve this slot',
    fullName: 'Your name',
    email: 'Email',
    phone: 'Phone (Telegram / WhatsApp)',
    reserveCta: 'Reserve & lock my seat',
    reserving: 'Reserving + creating Zoho Meeting…',
    cancel: 'Cancel',
    successTitle: 'Reserved.',
    successBody: (booking: string) =>
      `Booking ${booking} confirmed. Check your email for the Zoho Meeting link + Google Calendar invite.`,
    successCta: 'Done',
    fallbackNote: 'Mentor will share the Zoho Meeting link in your confirmation email within 24 hours.',
    error_reserve: 'Could not reserve. The slot may have just filled — please pick another.',
  },
  vi: {
    pickTime: 'Chọn giờ học',
    hide: 'Ẩn giờ',
    loading: 'Đang tải các slot…',
    empty: 'Chưa có slot trống — nhắn mentor qua Telegram / WhatsApp để chọn giờ riêng.',
    error: 'Không tải được slot — vui lòng thử lại.',
    seatsLeft: (n: number) => `Còn ${n} chỗ`,
    bookThis: 'Đặt slot này →',
    reserveTitle: 'Giữ chỗ slot này',
    fullName: 'Họ và tên',
    email: 'Email',
    phone: 'Số điện thoại (Telegram / WhatsApp)',
    reserveCta: 'Giữ chỗ & khoá lịch',
    reserving: 'Đang giữ chỗ + tạo Zoho Meeting…',
    cancel: 'Huỷ',
    successTitle: 'Đã giữ chỗ.',
    successBody: (booking: string) =>
      `Booking ${booking} đã xác nhận. Vui lòng kiểm tra email để nhận link Zoho Meeting + Google Calendar invite.`,
    successCta: 'Xong',
    fallbackNote: 'Mentor sẽ gửi link Zoho Meeting trong email xác nhận trong vòng 24 giờ.',
    error_reserve: 'Không giữ chỗ được. Slot có thể vừa đầy — vui lòng chọn slot khác.',
  },
};

type ReserveStatus = 'idle' | 'submitting' | 'success' | 'error';

type ReserveResult = {
  booking_reference: string;
  slot: {
    id: string;
    service_id: string;
    service_name: string;
    slot_start_at: string;
    slot_end_at: string;
    timezone: string;
    label: string | null;
  };
  meeting: {
    join_url: string | null;
    calendar_event_id: string | null;
    provisioned: boolean;
    fallback: string | null;
  };
  next_steps?: {
    expect_email: boolean;
    expect_calendar_invite: boolean;
    mentor_followup_within_hours: number;
  };
};

// ---------- Calendar export helpers (universal Add-to-Calendar) ------------
//
// Humanitix-style: one click adds the booking to whatever calendar the
// learner already uses. We build a Google Calendar template URL + an .ics
// file (data URL) so iOS Calendar / Outlook / any other client picks it up.
// Apple Wallet .pkpass + Google Wallet API would require signing
// certificates / Wallet API setup — out of scope; .ics covers iOS Calendar
// + Apple Wallet's "Add Event" prompt natively.

function _toIcsDate(dateIso: string): string {
  // Convert "2026-05-09T19:00:00+10:00" into "20260509T090000Z" (UTC).
  const d = new Date(dateIso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function buildGoogleCalendarUrl(opts: {
  title: string;
  startIso: string;
  endIso: string;
  description: string;
  location: string;
}): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${_toIcsDate(opts.startIso)}/${_toIcsDate(opts.endIso)}`,
    details: opts.description,
    location: opts.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcsDataUrl(opts: {
  title: string;
  startIso: string;
  endIso: string;
  description: string;
  location: string;
  uid: string;
}): string {
  const escape = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI Mentor 1-on-1 Pro//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${opts.uid}@aimentor.bookedai.au`,
    `DTSTAMP:${_toIcsDate(new Date().toISOString())}`,
    `DTSTART:${_toIcsDate(opts.startIso)}`,
    `DTEND:${_toIcsDate(opts.endIso)}`,
    `SUMMARY:${escape(opts.title)}`,
    `DESCRIPTION:${escape(opts.description)}`,
    `LOCATION:${escape(opts.location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const ics = lines.join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

// ---------------- Booking Success Card (Humanitix-inspired) ---------------
//
// After a successful slot reservation we render a polished, mobile-first
// summary card with: confirmation header, order detail, Zoho Meeting CTA,
// universal "Add to calendar" actions (Google Calendar deep link + .ics
// download — covers iOS Calendar / Apple Wallet event prompt / Outlook),
// channel CTAs, and a compact what-happens-next timeline. No external
// wallet API (.pkpass / Google Wallet API need signing certs — out of
// scope) so we use the universally-supported .ics + Google Calendar URL.

const successCardCopy = {
  en: {
    eyebrow: 'Confirmed · Booking secured',
    headline: 'You\'re in. Mentor will reach out within 24 hours.',
    summaryTitle: 'Order summary',
    summaryProgram: 'Program',
    summarySlot: 'Slot',
    summaryReference: 'Booking reference',
    summaryDuration: 'Duration',
    minutes: 'min',
    meetingTitle: 'Your Zoho Meeting',
    meetingCta: 'Open Zoho Meeting',
    meetingFallback: 'Mentor will share the Zoho Meeting link via email + Telegram within 24 hours.',
    addToCalendarTitle: 'Add to your calendar',
    addToCalendarLead: 'One click — works with Google, Apple, Outlook, or any other calendar.',
    googleCalendar: 'Add to Google Calendar',
    icsDownload: 'Download .ics file (Apple / Outlook)',
    nextStepsTitle: 'What happens next',
    nextSteps: [
      'Confirmation email is on its way (with the meeting link + Google Calendar invite).',
      'Mentor reaches out personally on Telegram or WhatsApp within 24 hours.',
      'Show up at the slot time — Zoho Meeting opens with screen share + auto-recording.',
      'After the session: 5-minute demo of what you built, progress notes logged, monthly check-in starts.',
    ],
    channelsTitle: 'Talk to mentor on your channel',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    email: 'Email',
    doneCta: 'Done',
    poweredBy: 'Booked on aimentor.bookedai.au · powered by BookedAI',
  },
  vi: {
    eyebrow: 'Đã xác nhận · Booking đã giữ chỗ',
    headline: 'Đã giữ chỗ. Mentor sẽ liên hệ trong 24 giờ.',
    summaryTitle: 'Chi tiết đơn',
    summaryProgram: 'Chương trình',
    summarySlot: 'Giờ học',
    summaryReference: 'Mã booking',
    summaryDuration: 'Thời lượng',
    minutes: 'phút',
    meetingTitle: 'Phòng học Zoho Meeting',
    meetingCta: 'Mở Zoho Meeting',
    meetingFallback: 'Mentor sẽ gửi link Zoho Meeting qua email + Telegram trong 24 giờ.',
    addToCalendarTitle: 'Thêm vào lịch của bạn',
    addToCalendarLead: 'Một cú click — chạy cho Google, Apple, Outlook, hoặc lịch nào bạn đang dùng.',
    googleCalendar: 'Thêm vào Google Calendar',
    icsDownload: 'Tải file .ics (Apple / Outlook)',
    nextStepsTitle: 'Bước tiếp theo',
    nextSteps: [
      'Email xác nhận sẽ tới ngay (kèm link Meeting + Google Calendar invite).',
      'Mentor liên hệ cá nhân qua Telegram hoặc WhatsApp trong 24 giờ.',
      'Đến giờ slot — Zoho Meeting mở ra với share màn hình + tự ghi hình.',
      'Sau buổi học: demo 5 phút sản phẩm bạn xây, ghi chú tiến độ, bật check-in tháng.',
    ],
    channelsTitle: 'Trao đổi với mentor',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    email: 'Email',
    doneCta: 'Xong',
    poweredBy: 'Đặt qua aimentor.bookedai.au · vận hành bởi BookedAI',
  },
};

function BookingSuccessCard({
  result,
  locale,
  onDone,
}: {
  result: ReserveResult;
  locale: Locale;
  onDone: () => void;
}) {
  const copy = successCardCopy[locale];
  const start = new Date(result.slot.slot_start_at);
  const end = new Date(result.slot.slot_end_at);
  const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  const dateFmt = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Australia/Sydney',
  });
  const slotLabel = dateFmt.format(start);

  const description = [
    `AI Mentor 1-on-1 — ${result.slot.service_name}`,
    `Booking ${result.booking_reference}`,
    result.meeting.join_url ? `Zoho Meeting: ${result.meeting.join_url}` : '',
    'Mentor follow-up via Telegram or WhatsApp within 24 hours.',
  ]
    .filter(Boolean)
    .join('\n');
  const calendarTitle = `AI Mentor 1-on-1 — ${result.slot.service_name}`;
  const location = result.meeting.join_url || 'Zoho Meeting (link in confirmation email)';
  const googleUrl = buildGoogleCalendarUrl({
    title: calendarTitle,
    startIso: result.slot.slot_start_at,
    endIso: result.slot.slot_end_at,
    description,
    location,
  });
  const icsUrl = buildIcsDataUrl({
    title: calendarTitle,
    startIso: result.slot.slot_start_at,
    endIso: result.slot.slot_end_at,
    description,
    location,
    uid: result.booking_reference,
  });
  const icsFilename = `aimentor-${result.booking_reference}.ics`;

  return (
    <div
      style={{
        marginTop: 4,
        padding: 0,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(20, 160, 146, 0.22)',
        background: 'var(--aim-paper)',
        boxShadow: '0 16px 48px -24px rgba(15, 92, 84, 0.32)',
      }}
    >
      {/* Header band */}
      <div
        style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, #0f5c54 0%, #14a092 100%)',
          color: '#fdfaf3',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--aim-font-mono)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#94e8d2',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ display: 'inline-flex', width: 16, height: 16, borderRadius: 999, background: '#94e8d2', alignItems: 'center', justifyContent: 'center', color: '#0f5c54', fontSize: 11, fontWeight: 800 }}>✓</span>
          {copy.eyebrow}
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: 'var(--aim-font-display)',
            fontWeight: 700,
            fontSize: '1.1rem',
            letterSpacing: '-0.015em',
            lineHeight: 1.35,
          }}
        >
          {copy.headline}
        </div>
      </div>

      {/* Order summary */}
      <div style={{ padding: 18, borderBottom: '1px solid var(--aim-line)' }}>
        <div
          style={{
            fontFamily: 'var(--aim-font-mono)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--aim-teal-deep)',
            marginBottom: 10,
          }}
        >
          {copy.summaryTitle}
        </div>
        <dl style={{ margin: 0, display: 'grid', rowGap: 8, fontSize: '0.88rem' }}>
          <SummaryRow label={copy.summaryProgram} value={result.slot.service_name} />
          <SummaryRow label={copy.summarySlot} value={`${slotLabel} · Sydney`} />
          <SummaryRow label={copy.summaryDuration} value={`${duration} ${copy.minutes}`} />
          <SummaryRow
            label={copy.summaryReference}
            value={
              <code
                style={{
                  fontFamily: 'var(--aim-font-mono)',
                  fontSize: '0.84rem',
                  background: 'rgba(20, 160, 146, 0.08)',
                  color: 'var(--aim-teal-deep)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  letterSpacing: '0.02em',
                }}
              >
                {result.booking_reference}
              </code>
            }
          />
        </dl>
      </div>

      {/* Meeting CTA */}
      <div style={{ padding: 18, borderBottom: '1px solid var(--aim-line)' }}>
        <div
          style={{
            fontFamily: 'var(--aim-font-mono)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--aim-coral)',
            marginBottom: 10,
          }}
        >
          {copy.meetingTitle}
        </div>
        {result.meeting.join_url ? (
          <a
            href={result.meeting.join_url}
            target="_blank"
            rel="noreferrer"
            className="aim-btn aim-btn-primary aim-btn-block"
            style={{ marginBottom: 4 }}
          >
            🎥 {copy.meetingCta} →
          </a>
        ) : (
          <p style={{ fontSize: '0.86rem', lineHeight: 1.55, color: 'var(--aim-muted)' }}>
            {copy.meetingFallback}
          </p>
        )}
      </div>

      {/* Add to calendar */}
      <div style={{ padding: 18, borderBottom: '1px solid var(--aim-line)' }}>
        <div
          style={{
            fontFamily: 'var(--aim-font-mono)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--aim-teal-deep)',
            marginBottom: 6,
          }}
        >
          {copy.addToCalendarTitle}
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--aim-muted)', marginBottom: 10 }}>
          {copy.addToCalendarLead}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href={googleUrl}
            target="_blank"
            rel="noreferrer"
            className="aim-btn aim-btn-outline aim-btn-block"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <span aria-hidden="true">📅</span> {copy.googleCalendar}
          </a>
          <a
            href={icsUrl}
            download={icsFilename}
            className="aim-btn aim-btn-outline aim-btn-block"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <span aria-hidden="true">⬇</span> {copy.icsDownload}
          </a>
        </div>
      </div>

      {/* What happens next */}
      <div style={{ padding: 18, borderBottom: '1px solid var(--aim-line)' }}>
        <div
          style={{
            fontFamily: 'var(--aim-font-mono)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--aim-teal-deep)',
            marginBottom: 10,
          }}
        >
          {copy.nextStepsTitle}
        </div>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {copy.nextSteps.map((step, idx) => (
            <li
              key={step}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontSize: '0.86rem',
                lineHeight: 1.55,
                color: 'var(--aim-text)',
              }}
            >
              <span
                style={{
                  flex: '0 0 auto',
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: idx === 0 ? 'rgba(255, 107, 61, 0.16)' : 'rgba(20, 160, 146, 0.12)',
                  color: idx === 0 ? 'var(--aim-coral)' : 'var(--aim-teal-deep)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--aim-font-mono)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  marginTop: 1,
                }}
              >
                {idx + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Channel CTAs */}
      <div style={{ padding: 18, borderBottom: '1px solid var(--aim-line)' }}>
        <div
          style={{
            fontFamily: 'var(--aim-font-mono)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--aim-teal-deep)',
            marginBottom: 10,
          }}
        >
          {copy.channelsTitle}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <a className="aim-channel-pill" href="https://t.me/BookedAI_Manager_Bot?start=svc.ai-mentor" target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 110, justifyContent: 'center' }}>
            {copy.telegram}
          </a>
          <a className="aim-channel-pill" href="https://wa.me/61455301335" target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 110, justifyContent: 'center' }}>
            {copy.whatsapp}
          </a>
          <a className="aim-channel-pill" href="mailto:aimentor@bookedai.au" style={{ flex: 1, minWidth: 110, justifyContent: 'center' }}>
            {copy.email}
          </a>
        </div>
      </div>

      {/* Footer / done */}
      <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'rgba(20, 160, 146, 0.04)' }}>
        <span style={{ fontSize: '0.74rem', color: 'var(--aim-muted)', fontFamily: 'var(--aim-font-mono)', letterSpacing: '0.04em' }}>
          {copy.poweredBy}
        </span>
        <button type="button" onClick={onDone} className="aim-btn aim-btn-ghost aim-btn-sm">
          {copy.doneCta}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 35%) 1fr', gap: 10, alignItems: 'baseline' }}>
      <dt style={{ fontFamily: 'var(--aim-font-mono)', fontSize: '0.72rem', color: 'var(--aim-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600, color: 'var(--aim-ink)', wordBreak: 'break-word' }}>{value}</dd>
    </div>
  );
}

function TimeSlotPicker({
  serviceId,
  locale,
  onPick,
}: {
  serviceId: string;
  locale: Locale;
  onPick: (slot: TimeSlot) => void;
}) {
  const copy = slotPickerCopy[locale];
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Inline reserve form state — surfaces as an expanded panel under the
  // chosen slot. Skips the separate registration form entirely; the Zoho
  // Meeting + Calendar invite are created server-side in one shot.
  const [activeSlot, setActiveSlot] = useState<TimeSlot | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<ReserveStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ReserveResult | null>(null);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Australia/Sydney',
      }),
    [locale],
  );

  async function load() {
    if (slots !== null) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/v1/aimentor/services/${encodeURIComponent(serviceId)}/slots`);
      if (!res.ok) throw new Error('http');
      const payload = (await res.json()) as { status?: string; data?: { slots?: TimeSlot[] } };
      if (payload.status !== 'ok' || !payload.data) throw new Error('shape');
      setSlots(payload.data.slots ?? []);
    } catch {
      setLoadError(copy.error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (!open) void load();
    setOpen((v) => !v);
    if (open) {
      // collapsing — reset form state
      setActiveSlot(null);
      setStatus('idle');
      setErrorMsg(null);
      setResult(null);
    }
  }

  function handleSlotClick(slot: TimeSlot) {
    setActiveSlot(slot);
    setStatus('idle');
    setErrorMsg(null);
    setResult(null);
    onPick(slot);
  }

  async function handleReserve(event: React.FormEvent) {
    event.preventDefault();
    if (!activeSlot) return;
    setStatus('submitting');
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/v1/aimentor/slots/${encodeURIComponent(activeSlot.id)}/reserve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || null,
            locale,
          }),
        },
      );
      const payload = (await res.json().catch(() => null)) as
        | { status?: string; data?: ReserveResult; error?: { message?: string } }
        | null;
      if (!res.ok || !payload || payload.status !== 'ok' || !payload.data) {
        setErrorMsg(payload?.error?.message || copy.error_reserve);
        setStatus('error');
        return;
      }
      setResult(payload.data);
      setStatus('success');
      // Force-reload slots so the seats counter reflects the booking
      setSlots(null);
      void load();
    } catch {
      setErrorMsg(copy.error_reserve);
      setStatus('error');
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          width: '100%',
          padding: '8px 14px',
          borderRadius: 10,
          border: '1px solid rgba(20, 160, 146, 0.32)',
          background: open ? 'rgba(20, 160, 146, 0.06)' : 'rgba(20, 160, 146, 0.03)',
          color: 'var(--aim-teal-deep)',
          fontFamily: 'var(--aim-font-mono)',
          fontSize: '0.78rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span>{open ? copy.hide : copy.pickTime}</span>
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <div style={{ marginTop: 10 }}>
          {status === 'success' && result ? (
            <BookingSuccessCard
              result={result}
              locale={locale}
              onDone={() => {
                setActiveSlot(null);
                setStatus('idle');
                setResult(null);
                setFullName('');
                setEmail('');
                setPhone('');
              }}
            />
          ) : activeSlot ? (
            <form
              onSubmit={handleReserve}
              style={{
                padding: 14,
                borderRadius: 12,
                background: 'rgba(20, 160, 146, 0.04)',
                border: '1px solid rgba(20, 160, 146, 0.18)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ fontFamily: 'var(--aim-font-mono)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--aim-coral)' }}>
                {copy.reserveTitle}
              </div>
              <div style={{ fontFamily: 'var(--aim-font-display)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--aim-ink)' }}>
                {dateFmt.format(new Date(activeSlot.slot_start_at))} · Sydney
              </div>
              <input
                className="aim-input"
                type="text"
                required
                placeholder={copy.fullName}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                style={{ fontSize: '0.9rem' }}
              />
              <input
                className="aim-input"
                type="email"
                required
                placeholder={copy.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={{ fontSize: '0.9rem' }}
              />
              <input
                className="aim-input"
                type="tel"
                placeholder={copy.phone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                style={{ fontSize: '0.9rem' }}
              />
              {errorMsg ? (
                <div className="aim-status-error" role="alert" style={{ fontSize: '0.84rem' }}>
                  {errorMsg}
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  className="aim-btn aim-btn-primary"
                  disabled={status === 'submitting'}
                  style={{ flex: 1, fontSize: '0.88rem' }}
                >
                  {status === 'submitting' ? copy.reserving : copy.reserveCta}
                </button>
                <button
                  type="button"
                  className="aim-btn aim-btn-ghost"
                  onClick={() => {
                    setActiveSlot(null);
                    setStatus('idle');
                    setErrorMsg(null);
                  }}
                  style={{ fontSize: '0.84rem' }}
                >
                  {copy.cancel}
                </button>
              </div>
            </form>
          ) : loading ? (
            <div style={{ padding: 12, fontSize: '0.85rem', color: 'var(--aim-muted)' }}>{copy.loading}</div>
          ) : slots && slots.length === 0 ? (
            <div style={{ padding: 12, fontSize: '0.85rem', color: 'var(--aim-muted)', lineHeight: 1.5 }}>
              {loadError ?? copy.empty}
            </div>
          ) : (
            (() => {
              // Group slots by date (Sydney) so the grid reads
              // "Sat 09 May" header → time chips below.
              const grouped = new Map<string, TimeSlot[]>();
              const dayFmt = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                timeZone: 'Australia/Sydney',
              });
              const timeFmt = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'Australia/Sydney',
              });
              for (const slot of slots ?? []) {
                const key = dayFmt.format(new Date(slot.slot_start_at));
                const list = grouped.get(key) ?? [];
                list.push(slot);
                grouped.set(key, list);
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {Array.from(grouped.entries()).map(([day, daySlots]) => (
                    <div key={day}>
                      <div
                        style={{
                          fontFamily: 'var(--aim-font-mono)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: 'var(--aim-teal-deep)',
                          marginBottom: 6,
                          paddingLeft: 2,
                        }}
                      >
                        {day}
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                          gap: 6,
                        }}
                      >
                        {daySlots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => handleSlotClick(slot)}
                            style={{
                              padding: '12px 10px',
                              borderRadius: 10,
                              border: '1px solid var(--aim-line)',
                              background: 'var(--aim-paper)',
                              color: 'var(--aim-ink)',
                              fontFamily: 'var(--aim-font-body)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 4,
                              minHeight: 56,
                            }}
                          >
                            <strong
                              style={{
                                fontFamily: 'var(--aim-font-display)',
                                fontWeight: 700,
                                fontSize: '1rem',
                                letterSpacing: '-0.005em',
                              }}
                            >
                              {timeFmt.format(new Date(slot.slot_start_at))}
                            </strong>
                            <span
                              style={{
                                fontFamily: 'var(--aim-font-mono)',
                                fontSize: '0.66rem',
                                color: 'var(--aim-coral)',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {copy.seatsLeft(slot.seats_available)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      ) : null}
    </div>
  );
}

function PriceBlock({ program, t }: { program: Program; t: Dict }) {
  if (program.discountedAmount != null && program.originalAmount != null) {
    const savings = program.originalAmount - program.discountedAmount;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="aim-program-amount">{formatPrice(program.discountedAmount, program.currency)}</span>
          <span className="aim-program-amount-suffix">{program.suffix}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', flexWrap: 'wrap' }}>
          <span style={{ textDecoration: 'line-through', color: 'var(--aim-muted)' }}>{t.catalog.wasLabel} {formatPrice(program.originalAmount, program.currency)}</span>
          <span style={{ color: 'var(--aim-coral)', fontWeight: 700, fontFamily: 'var(--aim-font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.74rem' }}>{t.catalog.savingsLabel} {formatPrice(savings, program.currency)}</span>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
      <div><span className="aim-program-amount">{program.customLabel}</span></div>
      <span style={{ fontSize: '0.78rem', color: 'var(--aim-coral)', fontWeight: 600, fontFamily: 'var(--aim-font-mono)' }}>{program.suffix}</span>
    </div>
  );
}

function Catalog({
  t,
  locale,
  onSelect,
  onSlotPick,
}: {
  t: Dict;
  locale: Locale;
  onSelect: (programName: string) => void;
  onSlotPick: (programName: string, slot: TimeSlot) => void;
}) {
  // Programs with a discounted price get the slot picker — custom-pricing
  // programs (Project-based + Ongoing) skip it because slot selection
  // happens after the mentor scopes the engagement.
  const slotEligible = (p: Program) => p.discountedAmount != null;

  return (
    <section id="programs" className="aim-section aim-section-light">
      <div className="aim-container">
        <header className="aim-section-header">
          <span className="aim-eyebrow aim-eyebrow-coral">{t.catalog.eyebrow}</span>
          <h2 className="aim-section-title">{t.catalog.title}</h2>
          <p className="aim-section-lead">{t.catalog.lead}</p>
        </header>
        <div className="aim-grid-3">
          {t.catalog.programs.map((program) => (
            <article key={program.id} className="aim-program-card" data-featured={program.featured ? 'true' : 'false'}>
              <div style={{ marginInline: -26, marginTop: -26, marginBottom: 12, borderTopLeftRadius: 'var(--aim-radius-lg)', borderTopRightRadius: 'var(--aim-radius-lg)', overflow: 'hidden' }}>
                <ProgramIllustration kind={program.icon as 'first-app' | 'executes' | 'real-product' | 'project-builder' | 'ongoing'} uid={program.id} />
              </div>
              <span className="aim-program-format">{program.tier}</span>
              <h3 className="aim-program-tier">{program.name}</h3>
              <p className="aim-program-summary">{program.summary}</p>
              <ul className="aim-program-list">{program.tags.map((tag) => (<li key={tag}>{tag}</li>))}</ul>
              <PriceBlock program={program} t={t} />
              {slotEligible(program) ? (
                <TimeSlotPicker
                  serviceId={program.id}
                  locale={locale}
                  onPick={(slot) => onSlotPick(program.name, slot)}
                />
              ) : null}
              <button type="button" className="aim-btn aim-btn-primary aim-btn-block" onClick={() => onSelect(program.name)} aria-label={`${t.catalog.bookCta}: ${program.name}`}>{t.catalog.bookCta} →</button>
            </article>
          ))}
        </div>
        <p style={{ marginTop: 24, color: 'var(--aim-muted)', fontSize: '0.85rem', fontWeight: 500 }}>{t.catalog.groupNote}</p>
      </div>
    </section>
  );
}

function Flow({ t }: { t: Dict }) {
  return (
    <section id="how-it-works" className="aim-section aim-section-paper">
      <div className="aim-container">
        <header className="aim-section-header">
          <span className="aim-eyebrow">{t.flow.eyebrow}</span>
          <h2 className="aim-section-title">{t.flow.title}</h2>
          <p className="aim-section-lead">{t.flow.lead}</p>
        </header>
        <ol className="aim-step-list">
          {t.flow.steps.map((step, idx) => (<li key={step.title} className="aim-step"><div className="aim-step-num">{idx + 1}</div><div className="aim-step-title">{step.title}</div><p className="aim-step-text">{step.body}</p></li>))}
        </ol>
      </div>
    </section>
  );
}

function TrustBlock({ t }: { t: Dict }) {
  return (
    <section className="aim-section aim-section-light">
      <div className="aim-container">
        <header className="aim-section-header"><span className="aim-eyebrow">{t.trust.eyebrow}</span><h2 className="aim-section-title">{t.trust.title}</h2></header>
        <div className="aim-grid-2">
          {t.trust.items.map((item) => (
            <div key={item.title} className="aim-card-flat" style={{ display: 'flex', gap: 16, padding: 24 }}>
              <div style={{ flex: '0 0 auto', width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(20, 160, 146, 0.14) 0%, rgba(20, 160, 146, 0.02) 100%)', color: 'var(--aim-teal-deep)', border: '1px solid rgba(20, 160, 146, 0.18)' }}><TrustBadgeIcon kind={item.icon as 'shield' | 'sparkle' | 'globe' | 'lock'} /></div>
              <div>
                <h3 style={{ fontFamily: 'var(--aim-font-display)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.015em', color: 'var(--aim-ink)' }}>{item.title}</h3>
                <p style={{ fontSize: '0.93rem', lineHeight: 1.65, color: 'var(--aim-muted)', marginTop: 6 }}>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsBlock({ t }: { t: Dict }) {
  return (
    <section id="results" className="aim-section aim-section-paper">
      <div className="aim-container">
        <header className="aim-section-header"><span className="aim-eyebrow aim-eyebrow-coral">{t.testimonials.eyebrow}</span><h2 className="aim-section-title">{t.testimonials.title}</h2><p className="aim-section-lead">{t.testimonials.lead}</p></header>
        <div className="aim-grid-3">
          {t.testimonials.items.map((item, idx) => (
            <article key={item.name} className="aim-card-flat" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 26 }}>
              <StarRow />
              <p style={{ fontFamily: 'var(--aim-font-display)', fontWeight: 600, fontSize: '1.02rem', lineHeight: 1.55, letterSpacing: '-0.015em', color: 'var(--aim-ink)', flex: 1 }}>“{item.quote}”</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, paddingTop: 16, borderTop: '1px solid var(--aim-line)' }}>
                <TestimonialAvatar initials={item.initials} gradientA={item.gradientA} gradientB={item.gradientB} id={`${idx}`} />
                <div>
                  <div style={{ fontFamily: 'var(--aim-font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--aim-ink)', letterSpacing: '-0.005em' }}>{item.name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--aim-muted)', marginTop: 1 }}>{item.role}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--aim-font-mono)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--aim-teal-deep)' }}>{item.program}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

type RegisterStatus = 'idle' | 'submitting' | 'sent' | 'error';

function RegistrationForm({ t, locale, preselectedProgram, onSelectProgram }: { t: Dict; locale: Locale; preselectedProgram: string | null; onSelectProgram: (program: string | null) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [program, setProgram] = useState<string>(preselectedProgram ?? '');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<RegisterStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => { if (preselectedProgram) setProgram(preselectedProgram); }, [preselectedProgram]);

  // When the learner picked a time slot from the Catalog, prefill the
  // message with the slot label so the lead arrives with intent + time
  // context already attached. Cleared after read so refreshing the page
  // doesn't re-inject stale state.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem('aimentor.bookedai.lastSlot');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { note?: string; programName?: string };
      if (parsed?.note) {
        setMessage((prev) => (prev ? `${prev}\n${parsed.note}` : parsed.note ?? ''));
      }
      if (parsed?.programName && !program) {
        setProgram(parsed.programName);
      }
      window.sessionStorage.removeItem('aimentor.bookedai.lastSlot');
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('submitting');
    setErrorMessage(null);
    try {
      const response = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_ref: AI_MENTOR_TENANT_REF, locale, full_name: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || null, interest: program || null, message: message.trim() || null, source: 'aimentor_bookedai_au', medium: 'partner_subdomain', campaign: 'aimentor_register_form', surface: 'aimentor_bookedai_au_partner_app' }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const reason = (payload && payload.error && payload.error.message) || t.register.error;
        setErrorMessage(reason);
        setStatus('error');
        return;
      }
      setStatus('sent');
      onSelectProgram(null);
    } catch {
      setErrorMessage(t.register.error);
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <section id="register" className="aim-section aim-section-paper"><div className="aim-container"><div className="aim-card aim-status-success" style={{ maxWidth: 720, marginInline: 'auto' }}><div className="aim-status-success-title">{t.register.success.title}</div><p style={{ marginTop: 10, color: 'var(--aim-muted)', lineHeight: 1.65 }}>{t.register.success.body}</p><a className="aim-btn aim-btn-primary" href="#assistant" style={{ marginTop: 16 }}>{t.register.success.cta}</a></div></div></section>
    );
  }

  return (
    <section id="register" className="aim-section aim-section-paper">
      <div className="aim-container">
        <div style={{ maxWidth: 720, marginInline: 'auto' }}>
          <header className="aim-section-header"><span className="aim-eyebrow aim-eyebrow-coral">{t.register.eyebrow}</span><h2 className="aim-section-title">{t.register.title}</h2><p className="aim-section-lead">{t.register.lead}</p></header>
          <form className="aim-card aim-form-grid" onSubmit={handleSubmit} noValidate>
            <div className="aim-form-grid aim-form-grid-2">
              <div className="aim-field"><label className="aim-field-label aim-field-required" htmlFor="aim-fullName">{t.register.fields.fullName}</label><input id="aim-fullName" className="aim-input" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t.register.placeholders.fullName} autoComplete="name" /></div>
              <div className="aim-field"><label className="aim-field-label aim-field-required" htmlFor="aim-email">{t.register.fields.email}</label><input id="aim-email" className="aim-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.register.placeholders.email} autoComplete="email" /></div>
            </div>
            <div className="aim-form-grid aim-form-grid-2">
              <div className="aim-field"><label className="aim-field-label" htmlFor="aim-phone">{t.register.fields.phone}</label><input id="aim-phone" className="aim-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.register.placeholders.phone} autoComplete="tel" /></div>
              <div className="aim-field"><label className="aim-field-label" htmlFor="aim-program">{t.register.fields.program}</label><select id="aim-program" className="aim-select" value={program} onChange={(e) => setProgram(e.target.value)}><option value="">{t.register.programChoose}</option>{t.catalog.programs.map((p) => (<option key={p.id} value={p.name}>{p.tier} — {p.name}</option>))}</select></div>
            </div>
            <div className="aim-field"><label className="aim-field-label" htmlFor="aim-message">{t.register.fields.message}</label><textarea id="aim-message" className="aim-textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.register.placeholders.message} rows={3} /></div>
            {errorMessage && status === 'error' ? (<div className="aim-status-error" role="alert">{errorMessage}</div>) : null}
            <p className="aim-field-help">{t.register.consent}</p>
            <button type="submit" className="aim-btn aim-btn-primary aim-btn-lg" disabled={status === 'submitting'}>{status === 'submitting' ? t.register.submitting : t.register.submit}</button>
          </form>
        </div>
      </div>
    </section>
  );
}

function FAQ({ t }: { t: Dict }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section id="faq" className="aim-section aim-section-light">
      <div className="aim-container">
        <header className="aim-section-header"><span className="aim-eyebrow">{t.faq.eyebrow}</span><h2 className="aim-section-title">{t.faq.title}</h2></header>
        <div className="aim-card" style={{ maxWidth: 800, marginInline: 'auto' }}>
          {t.faq.items.map((item, idx) => { const isOpen = openIdx === idx; return (<div key={item.q} className="aim-faq-item" data-open={isOpen ? 'true' : 'false'}><button type="button" className="aim-faq-question" onClick={() => setOpenIdx(isOpen ? null : idx)} aria-expanded={isOpen}><span>{item.q}</span></button>{isOpen ? <div className="aim-faq-answer">{item.a}</div> : null}</div>); })}
        </div>
      </div>
    </section>
  );
}

function ChannelsBlock({ t }: { t: Dict }) {
  return (
    <section className="aim-section aim-section-dark">
      <div className="aim-container">
        <header className="aim-section-header aim-section-header-center"><span className="aim-eyebrow aim-eyebrow-on-dark">{t.channels.title}</span><h2 className="aim-section-title">{t.channels.lead}</h2></header>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <a className="aim-channel-pill" href="https://t.me/BookedAI_Manager_Bot?start=svc.ai-mentor" target="_blank" rel="noreferrer"><svg className="aim-channel-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.5 16.7 9.3 19c.4 0 .6-.2.8-.4l1.9-1.8 4 2.9c.7.4 1.2.2 1.4-.7L20 5c.3-1.1-.4-1.6-1.1-1.3L3.7 9.7c-1.1.4-1 1.1-.2 1.3l3.9 1.2L16.6 7c.4-.3.8-.1.5.2L9.5 16.7Z" /></svg>{t.channels.telegram}</a>
          <a className="aim-channel-pill" href="https://wa.me/61455301335?text=Hi%20AI%20Mentor%2C%20I%20want%20to%20book%20a%20mentoring%20session." target="_blank" rel="noreferrer"><svg className="aim-channel-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2.5c-5.27 0-9.55 4.28-9.55 9.55 0 1.68.44 3.32 1.28 4.78L2.5 21.5l4.83-1.26a9.55 9.55 0 0 0 4.71 1.23c5.27 0 9.55-4.28 9.55-9.55 0-2.55-.99-4.95-2.79-6.75A9.5 9.5 0 0 0 12.04 2.5Z" /></svg>{t.channels.whatsapp}</a>
          <a className="aim-channel-pill" href="mailto:aimentor@bookedai.au?subject=AI%20Mentor%20enrolment%20enquiry"><svg className="aim-channel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 7 8.5-7" /></svg>{t.channels.email}</a>
        </div>
      </div>
    </section>
  );
}

function FinalCtaBlock({ t }: { t: Dict }) {
  return (
    <section className="aim-section aim-section-dark">
      <div className="aim-container">
        <div style={{ maxWidth: 760, marginInline: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <span className="aim-eyebrow aim-eyebrow-on-dark">{t.finalCta.eyebrow}</span>
          <h2 className="aim-section-title" style={{ color: 'var(--aim-on-dark)', maxWidth: 640 }}>{t.finalCta.title}</h2>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.65, color: 'var(--aim-on-dark-muted)', maxWidth: 600 }}>{t.finalCta.lead}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 6 }}>
            <a className="aim-btn aim-btn-primary aim-btn-lg" href="#programs">{t.finalCta.primary}</a>
            <a className="aim-btn aim-btn-secondary aim-btn-lg" href="#assistant">{t.finalCta.secondary}</a>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 4 }}>
            <MoneyBackBadge label={t.finalCta.moneyBack} />
            <span className="aim-trust-chip aim-trust-chip-coral">{t.finalCta.bilingual}</span>
            <span className="aim-trust-chip">{t.finalCta.bookFast}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterBlock({ t }: { t: Dict }) {
  return (
    <footer className="aim-footer">
      <div className="aim-container">
        <div className="aim-footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--aim-on-dark)' }}><span className="aim-brand-mark"><BrandMark size={22} /></span><h4 style={{ marginBottom: 0 }}>AI Mentor 1-on-1 Pro</h4></div>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.65, color: 'var(--aim-on-dark-muted)', marginTop: 14 }}>{t.footer.tagline}</p>
          </div>
          <div>
            <h4>{t.nav.programs}</h4>
            <a className="aim-footer-link" href="#programs">{t.footer.links.programs}</a>
            <a className="aim-footer-link" href="#mentor">{t.footer.links.profile}</a>
            <a className="aim-footer-link" href="#how-it-works">{t.footer.links.howItWorks}</a>
            <a className="aim-footer-link" href="#results">{t.footer.links.results}</a>
            <a className="aim-footer-link" href="#faq">{t.footer.links.faq}</a>
          </div>
          <div>
            <h4>{t.footer.contactTitle}</h4>
            <a className="aim-footer-link" href="https://t.me/BookedAI_Manager_Bot?start=svc.ai-mentor" target="_blank" rel="noreferrer">{t.channels.telegram}</a>
            <a className="aim-footer-link" href="https://wa.me/61455301335" target="_blank" rel="noreferrer">{t.channels.whatsapp}</a>
            <a className="aim-footer-link" href="mailto:aimentor@bookedai.au">aimentor@bookedai.au</a>
          </div>
          <div>
            <h4>{t.footer.links.login}</h4>
            <a className="aim-footer-link" href={PORTAL_BASE_URL}>{t.footer.links.login}</a>
          </div>
        </div>
        <div className="aim-footer-bottom"><span>{t.footer.legal}</span></div>
      </div>
    </footer>
  );
}

function StickyCta({ t }: { t: Dict }) {
  return (<div className="aim-sticky-cta" role="region" aria-label="Quick enrol"><div className="aim-sticky-cta-text"><strong>{t.stickyCta.lead}</strong><br />{t.finalCta.moneyBack}</div><a className="aim-btn aim-btn-primary aim-btn-sm" href="#programs">{t.stickyCta.cta}</a></div>);
}

type FeedbackStatus = 'idle' | 'submitting' | 'sent' | 'error';

function AIMentorFeedbackPage(props: { bookingReference: string | null; token: string | null; t: Dict }) {
  const { bookingReference, token, t } = props;
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(true);
  const [status, setStatus] = useState<FeedbackStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canSubmit = Boolean(bookingReference) && status !== 'submitting';

  async function handleSubmit() {
    if (!bookingReference) { setErrorMessage(t.feedback.missingError); return; }
    setStatus('submitting'); setErrorMessage(null);
    try {
      const search = new URLSearchParams();
      if (token) search.set('token', token);
      const queryString = search.toString() ? `?${search.toString()}` : '';
      const response = await fetch(`/api/v1/booking/${encodeURIComponent(bookingReference)}/feedback${queryString}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'x-portal-token': token } : {}) }, body: JSON.stringify({ rating, comment: comment.trim() || null, would_recommend: wouldRecommend, channel: 'aimentor_bookedai_au_feedback_page' }) });
      if (!response.ok) { const payload = await response.json().catch(() => null); const message = (payload && payload.error && payload.error.message) || t.feedback.genericError; setErrorMessage(message); setStatus('error'); return; }
      setStatus('sent');
    } catch { setErrorMessage(t.feedback.networkError); setStatus('error'); }
  }

  return (
    <main className="aim-shell">
      <div className="aim-container" style={{ paddingBlock: 56 }}>
        <a className="aim-brand" href="/aimentor" aria-label={t.nav.brandName} style={{ color: 'var(--aim-ink)' }}><span className="aim-brand-mark"><BrandMark size={22} /></span><span className="aim-brand-text"><span className="aim-brand-name" style={{ color: 'var(--aim-ink)' }}>{t.nav.brandName}</span><span className="aim-brand-tag">{t.nav.brandTag}</span></span></a>
        <div style={{ maxWidth: 640, marginTop: 32 }}>
          {!bookingReference ? (<section className="aim-card"><h1 className="aim-display" style={{ fontSize: '1.6rem' }}>{t.feedback.bookingMissing}</h1><p style={{ marginTop: 12, color: 'var(--aim-muted)', lineHeight: 1.65 }}>{t.feedback.bookingMissingBody}</p></section>) :
            status === 'sent' ? (<section className="aim-status-success"><div className="aim-status-success-title">{t.feedback.successTitle}</div><p style={{ marginTop: 10, color: 'var(--aim-muted)', lineHeight: 1.65 }}>{t.feedback.successBodyPrefix}<strong>{bookingReference}</strong>{t.feedback.successBodySuffix}</p><a className="aim-btn aim-btn-primary" href={`/portal/?ref=${encodeURIComponent(bookingReference)}${token ? `&token=${encodeURIComponent(token)}` : ''}`} style={{ marginTop: 14 }}>{t.feedback.openBooking}</a></section>) : (
              <section className="aim-card">
                <h1 className="aim-display" style={{ fontSize: '1.6rem' }}>{t.feedback.title}</h1>
                <p style={{ marginTop: 8, color: 'var(--aim-muted)', fontSize: '0.92rem' }}>Booking <strong>{bookingReference}</strong></p>
                <fieldset style={{ marginTop: 20, border: 0, padding: 0 }}><legend className="aim-field-label" style={{ paddingBlockEnd: 8 }}>{t.feedback.ratingLegend}</legend><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>{[1, 2, 3, 4, 5].map((value) => (<button key={value} type="button" onClick={() => setRating(value)} aria-label={`Rate ${value} out of 5`} aria-pressed={rating === value} className={`aim-btn ${rating === value ? 'aim-btn-primary' : 'aim-btn-outline'} aim-btn-sm`} style={{ minWidth: 44 }}>{value}</button>))}</div></fieldset>
                <div className="aim-field" style={{ marginTop: 18 }}><label className="aim-field-label" htmlFor="aim-comment">{t.feedback.commentLabel}</label><textarea id="aim-comment" className="aim-textarea" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder={t.feedback.commentPlaceholder} /></div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: '0.92rem', color: 'var(--aim-text)' }}><input type="checkbox" checked={wouldRecommend} onChange={(e) => setWouldRecommend(e.target.checked)} style={{ width: 20, height: 20 }} /><span>{t.feedback.recommend}</span></label>
                {errorMessage ? <div className="aim-status-error" role="alert" style={{ marginTop: 14 }}>{errorMessage}</div> : null}
                <div style={{ marginTop: 18 }}><button type="button" className="aim-btn aim-btn-primary" disabled={!canSubmit} onClick={handleSubmit}>{status === 'submitting' ? t.feedback.sending : t.feedback.sendCta}</button></div>
              </section>
            )}
        </div>
      </div>
    </main>
  );
}

export function AIMentorBookedAIApp() {
  const queryState = useMemo(() => parseQueryState(), []);
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const t = dict[locale];
  const [initialQuery, setInitialQuery] = useState<string | null>(queryState.initialQuery);
  const [initialQueryRequestId, setInitialQueryRequestId] = useState(queryState.initialQuery ? 1 : 0);
  const [preselectedProgram, setPreselectedProgram] = useState<string | null>(null);

  const setLocale = useCallback((next: Locale) => { setLocaleState(next); persistLocale(next); }, []);

  useEffect(() => {
    document.title = queryState.isFeedback ? t.htmlTitleFeedback : t.htmlTitle;
    if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', locale);
  }, [queryState.isFeedback, t.htmlTitleFeedback, t.htmlTitle, locale]);

  const triggerPrompt = useCallback((prompt: string) => { setInitialQuery(prompt); setInitialQueryRequestId((c) => c + 1); }, []);
  const onSelectProgram = useCallback((programName: string) => { setPreselectedProgram(programName); const target = document.getElementById('register'); if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, []);

  const onSlotPick = useCallback((programName: string, slot: TimeSlot) => {
    // When a learner picks a slot, drop them into the registration form
    // with the program preselected + the slot info appended into the
    // free-text "what do you want to build" field. The form will then
    // POST /api/v1/leads with the slot context in `message`.
    setPreselectedProgram(programName);
    const dt = new Date(slot.slot_start_at).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-AU', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Sydney',
    });
    const slotNote = locale === 'vi'
      ? `[Đã chọn slot] ${dt} (Sydney) · slot_id=${slot.id}`
      : `[Picked slot] ${dt} (Sydney) · slot_id=${slot.id}`;
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('aimentor.bookedai.lastSlot', JSON.stringify({ programName, slot, note: slotNote }));
      } catch {
        // ignore
      }
    }
    const target = document.getElementById('register');
    if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [locale]);

  if (queryState.isFeedback) return (<div className="aimentor-app"><AIMentorFeedbackPage bookingReference={queryState.feedbackBookingReference} token={queryState.feedbackToken} t={t} /></div>);

  return (
    <div className="aimentor-app">
      <PromoBanner t={t} />
      <TopNav t={t} locale={locale} onLocaleChange={setLocale} />
      <main className="aim-shell">
        <Hero t={t} onPrompt={triggerPrompt} initialQuery={initialQuery} initialQueryRequestId={initialQueryRequestId} />
        <OutcomesBlock t={t} />
        <MentorProfile t={t} />
        <Catalog t={t} locale={locale} onSelect={onSelectProgram} onSlotPick={onSlotPick} />
        <Flow t={t} />
        <TrustBlock t={t} />
        <TestimonialsBlock t={t} />
        <RegistrationForm t={t} locale={locale} preselectedProgram={preselectedProgram} onSelectProgram={setPreselectedProgram} />
        <FAQ t={t} />
        <ChannelsBlock t={t} />
        <FinalCtaBlock t={t} />
      </main>
      <FooterBlock t={t} />
      <StickyCta t={t} />
    </div>
  );
}

export default AIMentorBookedAIApp;
