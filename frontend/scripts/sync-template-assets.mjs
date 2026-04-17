import { mkdir, readFile, writeFile } from 'node:fs/promises';

const sourcePath = new URL('../src/theme/minimal-bento-template.css', import.meta.url);
const sourceCss = await readFile(sourcePath, 'utf8');

const outputs = [
  new URL('../public/template.css', import.meta.url),
  new URL('../../storage/uploads/template.css', import.meta.url),
];

for (const output of outputs) {
  await mkdir(new URL('.', output), { recursive: true });
  await writeFile(
    output,
    `/* Generated from frontend/src/theme/minimal-bento-template.css. */\n${sourceCss}`,
    'utf8',
  );
}
