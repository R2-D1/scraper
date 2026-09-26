import path from 'node:path';

import { CUSTOM_IMAGES_INTAKE_ROOT } from '../config/paths';
import { ingestCustomCollectionFolder, hasCustomCollectionManifest } from './custom-collection-intake';
import { ingestCustomImageFolder } from './custom-image-intake';
import { updateImageTranslations } from '../scripts/update-unsplash-translations';

function parseArgs(argv: string[]): { folderDir: string; dryRun: boolean } {
  let folderDir: string | undefined;
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (arg === '--dry-run') { dryRun = true; continue; }
    if (arg === '--folder' || arg === '--package' || arg === '-p') {
      folderDir = argv[++i];
      if (!folderDir) throw new Error('Потрібно вказати шлях після --folder.');
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log('Використання: pnpm run media:ingest:custom-images -- [<intake-folder>] [--dry-run]');
      process.exit(0);
    }
    if (!arg.startsWith('-') && !folderDir) { folderDir = arg; continue; }
    throw new Error(`Невідомий аргумент "${arg}".`);
  }
  return { folderDir: path.resolve(process.cwd(), folderDir ?? CUSTOM_IMAGES_INTAKE_ROOT), dryRun };
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (await hasCustomCollectionManifest(options.folderDir)) {
      const result = await ingestCustomCollectionFolder(options);
      if (!result.dryRun) {
        await updateImageTranslations({
          slugs: result.slugs,
          source: 'custom-images',
          pendingOnly: true,
          translateMissing: true,
        });
      }
      console.log(`Готово: колекція ${result.collectionSlug}, ${result.items} item(s), створено ${result.created}, оновлено ${result.updated}${result.dryRun ? ' (dry-run)' : ''}.`);
      return;
    }
    const results = await ingestCustomImageFolder(options);
    const summary = results.reduce((total, result) => ({
      items: total.items + result.items,
      created: total.created + result.created,
      updated: total.updated + result.updated,
      moved: total.moved + result.moved,
      detached: total.detached + result.detached,
      renamed: total.renamed + result.renamed,
    }), { items: 0, created: 0, updated: 0, moved: 0, detached: 0, renamed: 0 });
    console.log(`Готово: ${results.length} intake asset report(s), ${summary.items} item(s), створено ${summary.created}, оновлено ${summary.updated}, переміщено ${summary.moved}, перейменовано ${summary.renamed}, detach ${summary.detached}${results[0]?.dryRun ? ' (dry-run)' : ''}.`);
  } catch (error) {
    console.error(`Помилка: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

void main();
