import { mkdir, readFile, writeFile } from 'node:fs/promises';

const htmlPath = new URL('../dist/index.html', import.meta.url);
const sourceHtml = await readFile(htmlPath, 'utf8');

const variants = [
  {
    filename: 'product.html',
    replacements: [
      ['BookedAI.au | AI Receptionist for Australian SMEs', 'BookedAI Product | Live AI Booking Assistant'],
      [
        'BookedAI replies instantly, qualifies leads, and turns enquiries into booked jobs for salons, clinics, trades, kids services, and local service businesses across Australia.',
        'Try the live BookedAI product assistant on product.bookedai.au and experience the booking-ready search flow in a dedicated product runtime.',
      ],
      ['https://bookedai.au/', 'https://product.bookedai.au/'],
    ],
  },
  {
    filename: 'admin.html',
    replacements: [
      ['BookedAI.au | AI Receptionist for Australian SMEs', 'BookedAI Admin | Operations Workspace'],
      [
        'BookedAI replies instantly, qualifies leads, and turns enquiries into booked jobs for salons, clinics, trades, kids services, and local service businesses across Australia.',
        'Manage partner profiles, booking workflows, and operating data inside the BookedAI admin workspace.',
      ],
      ['https://bookedai.au/', 'https://admin.bookedai.au/'],
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
