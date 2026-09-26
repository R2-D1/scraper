import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';

import { RELATED_IMAGE_GROUPS_PATH } from '../config/paths';

export const RELATED_IMAGE_GROUP_SCHEMA_VERSION = 1;
export const RELATED_IMAGE_GROUP_MIN_ITEMS = 2;
export const RELATED_IMAGE_GROUP_MAX_ITEMS = 10;

export type RelatedImageGroupDefinition = {
  key: string;
  primaryMediaKey: string;
  mediaKeys: string[];
};

export type RelatedImageGroupRegistry = Map<string, RelatedImageGroupDefinition>;

export type RelatedImageGroupMediaItem = {
  mediaKey: string;
  category: string;
};

const GROUP_KEY_PATTERN = /^group-[a-f0-9]{16}$/;

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} не може бути порожнім.`);
  }
  return value.trim();
}

export function createRelatedImageGroupKey(mediaKeys: readonly string[]): string {
  const fingerprint = [...mediaKeys].sort().join('\n');
  return `group-${createHash('sha256').update(fingerprint).digest('hex').slice(0, 16)}`;
}

export function normalizeRelatedImageGroup(
  key: string,
  value: unknown,
): RelatedImageGroupDefinition {
  if (!GROUP_KEY_PATTERN.test(key)) {
    throw new Error(`Некоректний ключ групи "${key}".`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Група "${key}" має бути об'єктом.`);
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.mediaKeys)) {
    throw new Error(`Група "${key}" не має масиву mediaKeys.`);
  }
  const mediaKeys = record.mediaKeys.map((item, index) =>
    requiredString(item, `groups.${key}.mediaKeys[${index}]`),
  );
  if (
    mediaKeys.length < RELATED_IMAGE_GROUP_MIN_ITEMS ||
    mediaKeys.length > RELATED_IMAGE_GROUP_MAX_ITEMS
  ) {
    throw new Error(`Група "${key}" має містити від 2 до 10 зображень.`);
  }
  if (new Set(mediaKeys).size !== mediaKeys.length) {
    throw new Error(`Група "${key}" містить дубль mediaKey.`);
  }
  const primaryMediaKey = requiredString(
    record.primaryMediaKey,
    `groups.${key}.primaryMediaKey`,
  );
  if (!mediaKeys.includes(primaryMediaKey)) {
    throw new Error(`Головне зображення групи "${key}" не входить до її складу.`);
  }
  return {
    key,
    primaryMediaKey,
    mediaKeys: [primaryMediaKey, ...mediaKeys.filter(mediaKey => mediaKey !== primaryMediaKey).sort()],
  };
}

export async function loadRelatedImageGroupRegistry(
  registryPath = RELATED_IMAGE_GROUPS_PATH,
): Promise<RelatedImageGroupRegistry> {
  let raw: unknown;
  try {
    raw = JSON.parse(await fs.readFile(registryPath, 'utf-8')) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new Map();
    }
    throw error;
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Некоректний реєстр груп: ${registryPath}.`);
  }
  const record = raw as Record<string, unknown>;
  if (
    record.schemaVersion !== RELATED_IMAGE_GROUP_SCHEMA_VERSION ||
    record.groups === null ||
    typeof record.groups !== 'object' ||
    Array.isArray(record.groups)
  ) {
    throw new Error(`Некоректний реєстр груп: ${registryPath}.`);
  }
  return new Map(
    Object.entries(record.groups as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, normalizeRelatedImageGroup(key, value)]),
  );
}

export function validateRelatedImageGroups(
  groups: RelatedImageGroupRegistry,
  items: readonly RelatedImageGroupMediaItem[],
): void {
  const mediaByKey = new Map(items.map(item => [item.mediaKey, item]));
  const assigned = new Map<string, string>();
  for (const group of groups.values()) {
    let category: string | undefined;
    for (const mediaKey of group.mediaKeys) {
      const item = mediaByKey.get(mediaKey);
      if (!item) {
        throw new Error(`Група "${group.key}" посилається на невідомий mediaKey "${mediaKey}".`);
      }
      if (item.category !== 'images') {
        throw new Error(`Група "${group.key}" може містити лише зображення категорії images.`);
      }
      if (category && category !== item.category) {
        throw new Error(`Учасники групи "${group.key}" мають різні категорії.`);
      }
      category = item.category;
      const existingGroup = assigned.get(mediaKey);
      if (existingGroup) {
        throw new Error(`mediaKey "${mediaKey}" одночасно входить до груп "${existingGroup}" і "${group.key}".`);
      }
      assigned.set(mediaKey, group.key);
    }
  }
}

export function buildRelatedImageGroupByMediaKey(
  groups: RelatedImageGroupRegistry,
): Map<string, { key: string; position: number }> {
  const result = new Map<string, { key: string; position: number }>();
  for (const group of groups.values()) {
    group.mediaKeys.forEach((mediaKey, position) => {
      result.set(mediaKey, { key: group.key, position });
    });
  }
  return result;
}

export function serializeRelatedImageGroups(groups: RelatedImageGroupRegistry): string {
  return `${JSON.stringify({
    schemaVersion: RELATED_IMAGE_GROUP_SCHEMA_VERSION,
    groups: Object.fromEntries(
      [...groups.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, group]) => [key, {
          primaryMediaKey: group.primaryMediaKey,
          mediaKeys: group.mediaKeys,
        }]),
    ),
  }, null, 2)}\n`;
}
