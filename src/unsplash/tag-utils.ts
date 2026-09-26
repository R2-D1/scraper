import { normalizeToken } from '../i18n/utils';

export type LocalizedTag = {
  key: string;
  i18n: {
    en: string;
    uk: string;
  };
};

function slugifyTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildUniqueKey(base: string, used: Set<string>): string {
  if (!base) {
    throw new Error('Порожній key для тегу.');
  }
  let candidate = base;
  let counter = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  used.add(candidate);
  return candidate;
}

export function buildLocalizedTagEntries(
  tagsEn: string[],
  resolveTranslation: (value: string) => string
): LocalizedTag[] {
  const usedKeys = new Set<string>();
  return tagsEn.map(tagEn => {
    const en = tagEn.trim();
    if (!en) {
      throw new Error('Порожній англійський тег.');
    }
    const uk = resolveTranslation(en);
    if (!uk || !uk.trim()) {
      throw new Error(`Порожній переклад для тегу "${en}".`);
    }
    const baseKey = slugifyTag(en);
    if (!baseKey) {
      throw new Error(`Не вдалося згенерувати key для тегу "${en}".`);
    }
    const key = buildUniqueKey(baseKey, usedKeys);
    return {
      key,
      i18n: {
        en,
        uk: uk.trim(),
      },
    };
  });
}

export function extractTagLists(tags: LocalizedTag[] | undefined): { en: string[]; uk: string[] } {
  if (!Array.isArray(tags)) {
    return { en: [], uk: [] };
  }
  const en: string[] = [];
  const uk: string[] = [];
  for (const entry of tags) {
    const enValue = entry?.i18n?.en?.trim();
    const ukValue = entry?.i18n?.uk?.trim();
    if (enValue) {
      en.push(enValue);
    }
    if (ukValue) {
      uk.push(ukValue);
    }
  }
  const seenEn = new Set<string>();
  const seenUk = new Set<string>();
  return {
    en: en.filter(value => {
      const key = normalizeToken(value);
      if (!key || seenEn.has(key)) {
        return false;
      }
      seenEn.add(key);
      return true;
    }),
    uk: uk.filter(value => {
      const key = normalizeToken(value);
      if (!key || seenUk.has(key)) {
        return false;
      }
      seenUk.add(key);
      return true;
    }),
  };
}
