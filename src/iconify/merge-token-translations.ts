import { promises as fs } from 'node:fs';
import path from 'node:path';

import { TokenTranslationEntry, TokenTranslations } from './translation-helpers';

type CliOptions = {
  inputPath: string;
};

function showUsage(): void {
  console.log(
    [
      'Використання:',
      '  pnpm run iconify:merge-translations -- --input <шлях>',
      '',
      'Файл має містити JSON-об’єкт { "token": "переклад" } або масиви перекладів.',
    ].join('\n')
  );
}

function parseArgs(argv: string[]): CliOptions {
  let inputPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--input':
      case '-i': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Потрібно вказати шлях після --input.');
        }
        inputPath = value;
        index += 1;
        break;
      }
      case '--help':
      case '-h': {
        showUsage();
        process.exit(0);
      }
      case '--': {
        continue;
      }
      default: {
        throw new Error(`Невідомий аргумент "${arg}".`);
      }
    }
  }

  if (!inputPath) {
    throw new Error('Параметр --input є обов’язковим.');
  }

  return { inputPath };
}

function isValidEntry(value: unknown): value is TokenTranslationEntry {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.every(item => typeof item === 'string' && item.trim().length > 0);
  }
  return false;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const translationsPath = path.resolve(__dirname, 'token-translations.json');
  const inputPath = path.resolve(process.cwd(), options.inputPath);

  const [baseRaw, extraRaw] = await Promise.all([
    fs.readFile(translationsPath, 'utf-8'),
    fs.readFile(inputPath, 'utf-8'),
  ]);

  const base = JSON.parse(baseRaw) as TokenTranslations;
  const extra = JSON.parse(extraRaw) as TokenTranslations;

  let inserted = 0;
  let updated = 0;

  for (const [token, value] of Object.entries(extra)) {
    if (!isValidEntry(value)) {
      console.warn(`Пропускаю токен "${token}" через некоректне значення.`);
      continue;
    }
    if (token in base) {
      updated += 1;
    } else {
      inserted += 1;
    }
    base[token] = value;
  }

  const sortedEntries = Object.entries(base).sort((a, b) => a[0].localeCompare(b[0], 'en'));
  const serialized = `${JSON.stringify(Object.fromEntries(sortedEntries), null, 2)}\n`;
  await fs.writeFile(translationsPath, serialized, 'utf-8');

  console.log(`Готово: додано ${inserted}, оновлено ${updated}.`);
}

main().catch(error => {
  console.error('Не вдалося об’єднати переклади:', error);
  showUsage();
  process.exit(1);
});
