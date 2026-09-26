import path from 'node:path';

import { prepareIcons } from './prepare-icons';
import { prepareImages } from './prepare-images';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

type CliOptions = {
  keep: boolean;
  iconsOut?: string;
  imagesOut?: string;
  collection?: string;
};

function parseArgs(argv: string[]): CliOptions {
  let keep = false;
  let iconsOut: string | undefined;
  let imagesOut: string | undefined;
  let collection: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--keep':
        keep = true;
        break;
      case '--icons-out': {
        const value = argv[i + 1];
        if (!value) {
          throw new Error('Потрібно вказати шлях після --icons-out.');
        }
        iconsOut = path.resolve(PROJECT_ROOT, value);
        i += 1;
        break;
      }
      case '--images-out': {
        const value = argv[i + 1];
        if (!value) {
          throw new Error('Потрібно вказати шлях після --images-out.');
        }
        imagesOut = path.resolve(PROJECT_ROOT, value);
        i += 1;
        break;
      }
      case '--collection':
      case '-c': {
        const value = argv[i + 1];
        if (!value) {
          throw new Error('Потрібно вказати код колекції після --collection.');
        }
        collection = value;
        i += 1;
        break;
      }
      case '--help':
      case '-h':
        console.log(
          [
            'Використання:',
            '  pnpm run media:prepare:all [--keep] [--icons-out <path>] [--images-out <path>] [--collection <slug>]',
            '',
            'Параметри:',
            '  --keep             Не очищати папки призначення перед копіюванням.',
            '  --icons-out        Кастомний шлях для іконок (дефолт — tmp/icons).',
            '  --images-out       Кастомний шлях для зображень (дефолт — tmp/images).',
            '  --collection, -c   Обробити лише одну колекцію іконок.',
          ].join('\n')
        );
        process.exit(0);
      default:
        throw new Error(`Невідомий аргумент "${arg}".`);
    }
  }

  return { keep, iconsOut, imagesOut, collection };
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));

    const iconsResult = await prepareIcons({
      outDir: options.iconsOut ?? path.join(PROJECT_ROOT, 'tmp', 'icons'),
      keep: options.keep,
      collection: options.collection,
    });
    console.log(
      `Іконки: скопійовано ${iconsResult.copied}/${iconsResult.total} у ${path.relative(
        PROJECT_ROOT,
        options.iconsOut ?? path.join(PROJECT_ROOT, 'tmp', 'icons')
      )}`
    );

    const imagesResult = await prepareImages({
      outDir: options.imagesOut ?? path.join(PROJECT_ROOT, 'tmp', 'images'),
      keep: options.keep,
    });
    console.log(
      `Зображення: скопійовано ${imagesResult.copied}/${imagesResult.total} у ${path.relative(
        PROJECT_ROOT,
        options.imagesOut ?? path.join(PROJECT_ROOT, 'tmp', 'images')
      )}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Помилка: ${message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
