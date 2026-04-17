import { mkdir, readFile, writeFile } from 'node:fs/promises';

const htmlPath = new URL('../dist/index.html', import.meta.url);
const sourceHtml = await readFile(htmlPath, 'utf8');

const variants = [
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
];

await mkdir(new URL('../dist', import.meta.url), { recursive: true });

for (const variant of variants) {
  let nextHtml = sourceHtml;
  for (const [from, to] of variant.replacements) {
    nextHtml = nextHtml.split(from).join(to);
  }
  await writeFile(new URL(`../dist/${variant.filename}`, import.meta.url), nextHtml, 'utf8');
}
