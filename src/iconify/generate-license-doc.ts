import { promises as fs } from 'node:fs';
import path from 'node:path';

import { lookupCollections } from '@iconify/json';

type LicenseKey = 'MIT' | 'Apache 2.0' | 'CC BY 4.0' | 'CC0 1.0';

type TargetLicense = {
  label: LicenseKey;
  titles: string[];
  spdx: string[];
};

type CollectionInfo = {
  name?: string;
  license?: {
    title?: string;
    spdx?: string;
    url?: string;
  };
  author?: {
    name?: string;
    url?: string;
  };
};

type CollectionEntry = {
  prefix: string;
  name: string;
  licenseUrl?: string;
  author?: string;
  authorUrl?: string;
};

const TARGET_LICENSES: TargetLicense[] = [
  {
    label: 'MIT',
    titles: ['mit'],
    spdx: ['mit'],
  },
  {
    label: 'Apache 2.0',
    titles: ['apache 2.0', 'apache license 2.0'],
    spdx: ['apache-2.0'],
  },
  {
    label: 'CC BY 4.0',
    titles: [
      'cc by 4.0',
      'creative commons attribution 4.0',
      'creative commons attribution 4.0 international',
    ],
    spdx: ['cc-by-4.0'],
  },
  {
    label: 'CC0 1.0',
    titles: ['cc0 1.0', 'creative commons zero v1.0 universal'],
    spdx: ['cc0-1.0'],
  },
];

function normalize(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }
  return value.trim().toLowerCase();
}

function matchLicense(info: CollectionInfo['license']): LicenseKey | null {
  if (!info) {
    return null;
  }

  const normalizedTitle = normalize(info.title);
  const normalizedSpdx = normalize(info.spdx);

  for (const target of TARGET_LICENSES) {
    if (normalizedTitle && target.titles.includes(normalizedTitle)) {
      return target.label;
    }
    if (normalizedSpdx && target.spdx.includes(normalizedSpdx)) {
      return target.label;
    }
  }

  return null;
}

function formatEntry(entry: CollectionEntry): string {
  const parts: string[] = [`\`${entry.prefix}\` — ${entry.name}`];

  if (entry.author) {
    if (entry.authorUrl) {
      parts.push(`Автор: [${entry.author}](${entry.authorUrl})`);
    } else {
      parts.push(`Автор: ${entry.author}`);
    }
  }

  if (entry.licenseUrl) {
    parts.push(`[Ліцензія](${entry.licenseUrl})`);
  }

  return `- ${parts.join('; ')}`;
}

async function main(): Promise<void> {
  const docPath = path.resolve(process.cwd(), 'docs', 'iconify-license-collections.md');

  const grouped: Record<LicenseKey, CollectionEntry[]> = {
    'MIT': [],
    'Apache 2.0': [],
    'CC BY 4.0': [],
    'CC0 1.0': [],
  };

  const collections = await lookupCollections();

  for (const [prefix, info] of Object.entries(collections as Record<string, CollectionInfo>)) {
    const licenseKey = matchLicense(info.license);
    if (!licenseKey) {
      continue;
    }

    grouped[licenseKey].push({
      prefix,
      name: info.name ?? prefix,
      licenseUrl: info.license?.url,
      author: info.author?.name,
      authorUrl: info.author?.url,
    });
  }

  for (const licenseKey of Object.keys(grouped) as LicenseKey[]) {
    grouped[licenseKey].sort((a, b) => a.prefix.localeCompare(b.prefix, 'en'));
  }

  const lines: string[] = [
    '# Колекції Iconify за ліцензіями',
    '',
    'Цей перелік охоплює лише колекції з ліцензіями MIT, Apache 2.0, CC BY 4.0 та CC0 1.0, що доступні у пакеті `@iconify/json` (станом на момент генерації).',
    '',
  ];

  for (const target of TARGET_LICENSES) {
    lines.push(`## ${target.label}`, '');
    const entries = grouped[target.label];

    if (entries.length === 0) {
      lines.push('- (колекцій не знайдено)', '');
      continue;
    }

    for (const entry of entries) {
      lines.push(formatEntry(entry));
    }
    lines.push('', `Усього: ${entries.length}`, '');
  }

  await fs.writeFile(docPath, `${lines.join('\n')}\n`, 'utf-8');
  console.log(`Документ збережено у ${docPath}`);
}

main().catch(error => {
  console.error('Помилка під час формування документа з ліцензіями:', error);
  process.exit(1);
});
