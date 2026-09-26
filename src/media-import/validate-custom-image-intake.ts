import path from 'node:path';

import { CUSTOM_IMAGES_INTAKE_ROOT } from '../config/paths';
import { hasCustomCollectionManifest, ingestCustomCollectionFolder } from './custom-collection-intake';
import {
  findCustomImageAssetIntakes,
  readCustomImageAssetIntake,
} from './custom-image-intake';

async function main(): Promise<void> {
  try {
    const rootArg = process.argv.slice(2).find(arg => arg !== '--' && !arg.startsWith('-'));
    const root = path.resolve(process.cwd(), rootArg ?? CUSTOM_IMAGES_INTAKE_ROOT);
    if (await hasCustomCollectionManifest(root)) {
      const result = await ingestCustomCollectionFolder({ folderDir: root, dryRun: true });
      console.log(`Валідно: колекція ${result.collectionSlug}, ${result.items} зображень.`);
      return;
    }
    const flatAssets = await findCustomImageAssetIntakes(root);
    if (flatAssets.length === 0) throw new Error(`Не знайдено flat image assets у ${root}.`);
    let items = 0;
    for (const assetPath of flatAssets) {
      const intake = await readCustomImageAssetIntake(assetPath);
      items += 1;
      console.log(`Валідно: ${path.relative(process.cwd(), assetPath)} + ${path.basename(`${assetPath}.manifest.json`)} (mediaKey ${intake.mediaKey}, title ${intake.name.en}).`);
    }
    console.log(`Разом валідно: ${flatAssets.length} flat asset(s), ${items} зображень.`);
  } catch (error) {
    console.error(`Помилка: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

void main();
