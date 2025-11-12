import { lookupCollections } from '@iconify/json';

type LicenseKey = 'MIT' | 'Apache 2.0' | 'CC BY 4.0' | 'CC0 1.0';

type TargetLicense = {
  label: LicenseKey;
  titles: string[];
  spdx: string[];
};

type CollectionInfo = {
  prefix: string;
  name?: string;
  author?: {
    name?: string;
    url?: string;
  };
  license?: {
    title?: string;
    spdx?: string;
    url?: string;
  };
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

const targetByLabel = new Map<LicenseKey, TargetLicense>(
  TARGET_LICENSES.map(item => [item.label, item])
);

function normalize(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  return value.trim().toLowerCase();
}

function matchLicense(info: CollectionInfo['license'] | undefined): LicenseKey | null {
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

async function main(): Promise<void> {
  const result: Record<LicenseKey, Array<{
    prefix: string;
    name: string;
    licenseUrl?: string;
    author?: string;
    authorUrl?: string;
  }>> = {
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

    result[licenseKey].push({
      prefix,
      name: info.name ?? prefix,
      licenseUrl: info.license?.url,
      author: info.author?.name,
      authorUrl: info.author?.url,
    });
  }

  for (const licenseKey of Object.keys(result) as LicenseKey[]) {
    result[licenseKey].sort((a, b) => a.prefix.localeCompare(b.prefix, 'en'));
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error('Помилка під час збору колекцій за ліцензіями:', error);
  process.exit(1);
});
