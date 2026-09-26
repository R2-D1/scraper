import { promises as fs } from 'node:fs';
import path from 'node:path';

import { gatherAllTokens, gatherTokensForCollection } from './token-utils';
import { normalizeTranslationEntry, TokenTranslations } from './translation-helpers';

type CliOptions = {
  collection?: string;
  includeIdentical: boolean;
};

function showUsage(): void {
  console.log(
    [
      'Використання:',
      '  pnpm run iconify:missing-translations [--collection <назва>] [--include-identical]',
      '',
      'Параметри:',
      '  --collection, -c       Обробити лише конкретну колекцію Iconify.',
      '  --include-identical    Додатково позначати токени, де переклад повністю збігається з оригіналом.',
    ].join('\n')
  );
}

function parseArgs(argv: string[]): CliOptions {
  let collection: string | undefined;
  let includeIdentical = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--collection':
      case '-c': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('Потрібно вказати назву колекції після прапорця --collection.');
        }
        collection = value;
        index += 1;
        break;
      }
      case '--include-identical': {
        includeIdentical = true;
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

  return { collection, includeIdentical };
}

async function loadTranslations(): Promise<TokenTranslations> {
  const filePath = path.resolve(__dirname, 'token-translations.json');

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('token-translations.json має некоректну структуру.');
    }
    return parsed as TokenTranslations;
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      console.warn('Попередження: файл token-translations.json не знайдено. Повертаю порожній словник.');
      return {};
    }

    throw error;
  }
}

function isNumericToken(token: string): boolean {
  return /^\d+$/.test(token);
}

function isTranslationMissing(
  token: string,
  translations: TokenTranslations,
  includeIdentical: boolean
): boolean {
  const entry = translations[token];
  if (!entry) {
    return true;
  }
  if (!includeIdentical) {
    return false;
  }
  const normalized = normalizeTranslationEntry(entry);
  if (normalized.length === 0) {
    return true;
  }
  const base = token.toLowerCase();
  return normalized.every(value => value.toLowerCase() === base);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const translationsPath = path.resolve(__dirname, 'token-translations.json');

  const tokens = options.collection
    ? await gatherTokensForCollection(options.collection)
    : await gatherAllTokens();
  const translations = await loadTranslations();

  let numericAdded = 0;
  for (const token of tokens) {
    if (isNumericToken(token) && !(token in translations)) {
      translations[token] = token;
      numericAdded += 1;
    }
  }

  if (numericAdded > 0) {
    const sortedEntries = Object.keys(translations)
      .sort((a, b) => a.localeCompare(b, 'en'))
      .map(key => [key, translations[key]] as const);
    const serialized = `${JSON.stringify(Object.fromEntries(sortedEntries), null, 2)}\n`;
    await fs.writeFile(translationsPath, serialized, 'utf-8');
    console.log(`Додано ${numericAdded} числових токенів до словника перекладів.`);
  }

  const missing = tokens.filter(
    token => !isNumericToken(token) && isTranslationMissing(token, translations, options.includeIdentical)
  );

  const suffixParts: string[] = [];
  if (options.collection) {
    suffixParts.push(options.collection);
  }
  if (options.includeIdentical) {
    suffixParts.push('identical');
  }
  const fileName =
    suffixParts.length > 0
      ? `missing-translations-${suffixParts.join('-')}.json`
      : 'missing-translations.json';
  const outputDir = path.resolve(process.cwd(), 'tmp', 'iconify');
  const outputPath = path.join(outputDir, fileName);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(missing, null, 2)}\n`, 'utf-8');

  console.log(`Загальна кількість токенів: ${tokens.length}`);
  console.log(`Перекладені: ${tokens.length - missing.length}`);
  console.log(`Без перекладу: ${missing.length}`);
  console.log(`Результат збережено у ${outputPath}`);
}

main().catch(error => {
  console.error('Помилка під час пошуку відсутніх перекладів:', error);
  process.exit(1);
});
