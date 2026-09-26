import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectEnvPath = path.resolve(__dirname, '../..', '.env');
if (existsSync(projectEnvPath)) {
  process.loadEnvFile(projectEnvPath);
}

const MAX_TEXTS_PER_REQUEST = 50;

type DeepLResponse = {
  translations?: Array<{ text?: string }>;
};

export async function translateEnglishToUkrainian(texts: string[]): Promise<string[]> {
  if (!texts.length) {
    return [];
  }

  const apiKey = process.env.DEEPL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Для автоматичного перекладу додай DEEPL_API_KEY у локальний .env scraper.');
  }
  const translations: string[] = [];
  for (let start = 0; start < texts.length; start += MAX_TEXTS_PER_REQUEST) {
    const batch = texts.slice(start, start + MAX_TEXTS_PER_REQUEST);
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: batch, source_lang: 'EN', target_lang: 'UK' }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`DeepL API повернув HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as DeepLResponse;
    if (!Array.isArray(payload.translations) || payload.translations.length !== batch.length) {
      throw new Error('DeepL API повернув неочікувану кількість перекладів.');
    }

    for (const item of payload.translations) {
      const translated = item.text?.trim();
      if (!translated) {
        throw new Error('DeepL API повернув порожній переклад.');
      }
      translations.push(translated);
    }
  }

  return translations;
}
