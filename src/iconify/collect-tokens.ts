import { promises as fs } from 'node:fs';
import path from 'node:path';

import { gatherAllTokens } from './token-utils';

async function main(): Promise<void> {
  const outputDir = path.resolve(process.cwd(), 'tmp', 'iconify');
  const outputPath = path.join(outputDir, 'all-tokens.json');

  const tokens = await gatherAllTokens();
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(tokens, null, 2)}\n`, 'utf-8');

  console.log(`Зібрано ${tokens.length} унікальних токенів.`);
  console.log(`Збережено у ${outputPath}`);
}

main().catch(error => {
  console.error('Помилка під час збору токенів:', error);
  process.exit(1);
});
