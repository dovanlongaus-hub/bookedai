import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = process.env.BUILD_OUT_DIR?.trim()
  ? path.resolve(rootDir, process.env.BUILD_OUT_DIR.trim())
  : path.join(rootDir, 'dist');
const htmlPath = path.join(outputDir, 'index.html');
const sourceHtml = await readFile(htmlPath, 'utf8');

const variants = [
  {
    filename: 'home.html',
    replacements: [
      [
        'BookedAI captures demand across website, calls, chat, email, and follow-up, then converts it into bookings, revenue, and recovery opportunities for service businesses.',
        'BookedAI helps service SMEs capture demand, qualify leads faster, and convert more enquiries into booked revenue with one AI revenue engine.',
      ],
    ],
  },
  {
    filename: 'admin.html',
    replacements: [
      ['BookedAI | The AI Revenue Engine for Service Businesses', 'BookedAI Admin | Operations Workspace'],
      [
        'BookedAI captures demand across website, calls, chat, email, and follow-up, then converts it into bookings, revenue, and recovery opportunities for service businesses.',
        'Manage partner profiles, booking workflows, revenue signals, and operating data inside the BookedAI admin workspace.',
      ],
      ['https://bookedai.au/', 'https://admin.bookedai.au/'],
    ],
  },
  {
    filename: 'product.html',
    replacements: [
      ['BookedAI | The AI Revenue Engine for Service Businesses', 'BookedAI Product | Live Revenue Flow'],
      [
        'BookedAI captures demand across website, calls, chat, email, and follow-up, then converts it into bookings, revenue, and recovery opportunities for service businesses.',
        'Explore the live BookedAI revenue flow in a native-style product surface built for fast search, best-fit results, and booking-ready action.',
      ],
      ['https://bookedai.au/', 'https://product.bookedai.au/'],
    ],
  },
  {
    filename: 'pitch.html',
    replacements: [
      ['BookedAI | The AI Revenue Engine for Service Businesses', 'BookedAI Pitch | Revenue Engine Deck'],
      [
        'BookedAI captures demand across website, calls, chat, email, and follow-up, then converts it into bookings, revenue, and recovery opportunities for service businesses.',
        'Investor and SME pitch surface for BookedAI, showing the problem, revenue-engine wedge, product proof, market fit, team, and rollout path.',
      ],
      ['https://bookedai.au/', 'https://pitch.bookedai.au/'],
    ],
  },
  {
    filename: 'demo.html',
    replacements: [
      ['BookedAI | The AI Revenue Engine for Service Businesses', 'BookedAI Demo | Conversational Revenue Engine'],
      [
        'BookedAI captures demand across website, calls, chat, email, and follow-up, then converts it into bookings, revenue, and recovery opportunities for service businesses.',
        'Minimal conversational landing page for demo.bookedai.au with AI revenue-engine positioning, streaming chat preview, capability cards, integrations, and a direct Try Now call to action.',
      ],
      ['https://bookedai.au/', 'https://demo.bookedai.au/'],
    ],
  },
  {
    filename: 'futureswim.html',
    replacements: [
      [
        'BookedAI | The AI Revenue Engine for Service Businesses',
        'Future Swim on BookedAI | Preschool Swim School Experience',
      ],
      [
        'BookedAI captures demand across website, calls, chat, email, and follow-up, then converts it into bookings, revenue, and recovery opportunities for service businesses.',
        'Refactored Future Swim website with a premium preschool swim-school theme, BookedAI receptionist workflow, tenant-scoped booking flow, and Future Swim-only search and sales support.',
      ],
      ['https://bookedai.au/', 'https://futureswim.bookedai.au/'],
    ],
  },
  {
    filename: 'chess.html',
    replacements: [
      [
        'BookedAI | The AI Revenue Engine for Service Businesses',
        'GM Mai Hung Chess Academy | Premium Chess Programs on BookedAI',
      ],
      [
        'BookedAI captures demand across website, calls, chat, email, and follow-up, then converts it into bookings, revenue, and recovery opportunities for service businesses.',
        'Premium grandmaster-led chess academy tenant on BookedAI with tenant-scoped search, qualified lead capture, booking-intent flow, and academy-grade enquiry handling.',
      ],
      ['https://bookedai.au/', 'https://chess.bookedai.au/'],
    ],
  },
  {
    filename: 'ai-mentor-pro.html',
    replacements: [
      [
        'BookedAI | The AI Revenue Engine for Service Businesses',
        'AI Mentor Pro | Powered by BookedAI',
      ],
      [
        'BookedAI captures demand across website, calls, chat, email, and follow-up, then converts it into bookings, revenue, and recovery opportunities for service businesses.',
        'AI Mentor Pro uses the BookedAI engine for tenant-scoped mentoring search, booking, payment, email, CRM, and WhatsApp-ready follow-up across 1-1 and group AI mentoring packages.',
      ],
      ['https://bookedai.au/', 'https://ai.longcare.au/'],
    ],
  },
];

await mkdir(outputDir, { recursive: true });

for (const variant of variants) {
  let nextHtml = sourceHtml;
  for (const [from, to] of variant.replacements) {
    nextHtml = nextHtml.split(from).join(to);
  }
  await writeFile(path.join(outputDir, variant.filename), nextHtml, 'utf8');
}
