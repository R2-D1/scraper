import path from 'node:path';

import { CUSTOM_IMAGES_ROOT } from '../config/paths';
import { loadCustomImageLibrary } from './custom-images';

async function main(): Promise<void> {
  const rootArg = process.argv.slice(2).find(arg => arg !== '--' && !arg.startsWith('-'));
  const root = rootArg ? path.resolve(process.cwd(), rootArg) : CUSTOM_IMAGES_ROOT;
  const library = await loadCustomImageLibrary(root);
  const assigned = library.images.filter(item => item.meta.collectionSlugs.length > 0).length;
  const unassigned = library.images.length - assigned;
  console.log(`Валідно: ${library.collections.length} колекцій, ${library.images.length} зображень (${assigned} у колекціях, ${unassigned} без колекції).`);
}

main().catch(error => {
  console.error(`Помилка: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
