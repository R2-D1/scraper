import { promises as fs } from 'node:fs';
import path from 'node:path';
import { findMediaDir } from '../src/unsplash/library-paths';

const NAME_TRANSLATIONS_PATH = path.join(
  __dirname,
  '../translations/images/name-translations.json'
);

interface ValidationIssue {
  key: string;
  translation: string;
  issues: string[];
}

async function validateTranslations(): Promise<void> {
  console.log('Читаю файл перекладів...\n');
  const content = await fs.readFile(NAME_TRANSLATIONS_PATH, 'utf-8');
  const translations: Record<string, string> = JSON.parse(content);

  const issues: ValidationIssue[] = [];

  for (const [key, translation] of Object.entries(translations)) {
    const translationIssues: string[] = [];

    // 1. Перевірка на наявність перекладу (не є англійською)
    if (/^[a-zA-Z0-9\s\-_,.()\[\]{}:"'`~!@#$%^&*+=|\\<>?/]+$/.test(translation) && 
        !/[а-яА-ЯіІїЇєЄґҐ]/.test(translation)) {
      translationIssues.push('Можливо англійський текст (немає українських літер)');
    }

    // 2. Перевірка на велику літеру на початку
    if (translation.length > 0 && !/^[А-ЯІЇЄҐA-Z]/.test(translation)) {
      translationIssues.push('Не починається з великої літери');
    }

    // 3. Перевірка на крапки в середині (в кінці дозволено)
    const dotsInMiddle = translation.match(/[А-Яа-яіІїЇєЄґҐ].*\./);
    if (dotsInMiddle && !translation.endsWith('.')) {
      // Крапка не в кінці
      translationIssues.push('Містить крапку не в кінці');
    }

    // 4. Перевірка на посилання (http, https, www, .com, .org тощо)
    if (/https?:\/\/|www\.|\.(com|org|net|io|co|uk|ua|ru|de|fr|es)/i.test(translation)) {
      translationIssues.push('Містить посилання');
    }

    // 5. Перевірка на згадування автора (Photo by, Unsplash, @, автор, фотограф тощо)
    const authorPatterns = [
      /photo by/i,
      /unsplash/i,
      /@\w+/i,
      /\bавтор\b/i,
      /\bфотограф\b/i,
      /\bphotographer\b/i,
      /\bby \w+/i,
    ];
    if (authorPatterns.some(pattern => pattern.test(translation))) {
      translationIssues.push('Містить згадування автора');
    }

    // 6. Перевірка на незрозумілість (дуже короткі або неописові назви)
    const trimmed = translation.trim();
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    
    // Перевірка на незрозумілі абстрактні назви (лише один термін)
    const abstractTerms = [
      'калейдоскоп',
      'градієнт',
      'абстрактний',
      'ілюстрація',
      'фон',
      'патерн',
      'візерунок',
    ];
    if (words.length === 1 && abstractTerms.some(term => trimmed.toLowerCase().includes(term))) {
      // Можливо недостатньо описово
      translationIssues.push('Можливо недостатньо описова назва (лише загальний термін)');
    }

    if (translationIssues.length > 0) {
      issues.push({
        key,
        translation,
        issues: translationIssues,
      });
    }
  }

  // Виводимо результати
  console.log(`Перевірено записів: ${Object.keys(translations).length}`);
  console.log(`Знайдено проблем: ${issues.length}\n`);

  if (issues.length === 0) {
    console.log('✅ Всі переклади відповідають вимогам!');
    return;
  }

  // Групуємо проблеми за типом
  const byIssueType: Record<string, ValidationIssue[]> = {};
  for (const issue of issues) {
    for (const issueType of issue.issues) {
      if (!byIssueType[issueType]) {
        byIssueType[issueType] = [];
      }
      byIssueType[issueType].push(issue);
    }
  }

  console.log('=== ЗВЕДЕННЯ ЗА ТИПОМ ПРОБЛЕМ ===\n');
  for (const [issueType, items] of Object.entries(byIssueType)) {
    console.log(`${issueType}: ${items.length}`);
  }

  console.log('\n=== ДЕТАЛІ ПРОБЛЕМ ===\n');
  for (const issue of issues) {
    console.log(`Ключ: ${issue.key}`);
    console.log(`Переклад: "${issue.translation}"`);
    console.log(`Проблеми: ${issue.issues.join(', ')}`);
    console.log('---');
  }

  // Зберігаємо звіт у файл
  const reportPath = path.join(
    __dirname,
    '../translations/images/validation-report.json'
  );
  await fs.writeFile(
    reportPath,
    JSON.stringify(issues, null, 2),
    'utf-8'
  );
  console.log(`\n📄 Звіт збережено: ${reportPath}`);
}

// Допоміжна функція для пошуку зображення в бібліотеці
export async function findImageInLibrary(key: string): Promise<string | null> {
  const mediaDir = await findMediaDir(key);
  if (!mediaDir) {
    return null;
  }
  return mediaDir.dir;
}

if (require.main === module) {
  validateTranslations().catch(console.error);
}

