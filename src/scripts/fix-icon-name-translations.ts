import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Dictionary = Record<string, string>;
type Replacement = [RegExp, string | ((substring: string, ...matches: string[]) => string)];

const rootDir = resolve(__dirname, '..', '..');
const translationsPath = resolve(rootDir, 'translations/icon-translations/name-translations.json');

const raw = readFileSync(translationsPath, 'utf8');
const translations: Dictionary = JSON.parse(raw);

const manualOverrides: Dictionary = {
  armchair: 'Крісло',
  'armchair-off': 'Крісло (вимкнено)',
  'armchair-2-off': 'Крісло 2 (вимкнено)',
  'arrow-merge-both': 'Стрілка злиття з обох боків',
  'arrow-rotary-straight': 'Кільцева стрілка прямо',
  'arrow-wave-left-down': 'Хвиляста стрілка вниз-ліворуч',
  'arrow-wave-left-up': 'Хвиляста стрілка вгору-ліворуч',
  'arrow-wave-right-down': 'Хвиляста стрілка вниз-праворуч',
  'arrow-wave-right-up': 'Хвиляста стрілка вгору-праворуч',
  'arrow-bar-both': 'Панель зі стрілками в обидва боки',
  'arrow-bar-down': 'Панель зі стрілкою вниз',
  'arrow-bar-left': 'Панель зі стрілкою вліво',
  'arrow-bar-right': 'Панель зі стрілкою вправо',
  'arrow-bar-to-down': 'Панель зі стрілкою вниз',
  'arrow-bar-to-down-dashed': 'Панель зі стрілкою вниз (пунктир)',
  'arrow-bar-to-left': 'Панель зі стрілкою вліво',
  'arrow-bar-to-left-dashed': 'Панель зі стрілкою вліво (пунктир)',
  'arrow-bar-to-right': 'Панель зі стрілкою вправо',
  'arrow-bar-to-right-dashed': 'Панель зі стрілкою вправо (пунктир)',
  'arrow-bar-to-up': 'Панель зі стрілкою вгору',
  'arrow-bar-to-up-dashed': 'Панель зі стрілкою вгору (пунктир)',
  'arrow-bar-up': 'Панель зі стрілкою вгору',
  'arrow-bottom-circle': 'Стрілка вниз у колі',
  'arrow-down-circle': 'Стрілка вниз у колі',
  'arrow-down-left-circle': 'Стрілка вниз-ліворуч у колі',
  'arrow-down-right-circle': 'Стрілка вниз-праворуч у колі',
  'arrow-down-square': 'Стрілка вниз у квадраті',
  'arrow-down-rhombus': 'Стрілка вниз у ромбі',
  'arrow-down-tail': 'Стрілка вниз із хвостом',
  'arrow-down-to-arc': 'Стрілка вниз до дуги',
  'arrow-up-circle': 'Стрілка вгору у колі',
  'arrow-up-left-circle': 'Стрілка вгору-ліворуч у колі',
  'arrow-up-right-circle': 'Стрілка вгору-праворуч у колі',
  'arrow-up-square': 'Стрілка вгору у квадраті',
  'arrow-up-rhombus': 'Стрілка вгору у ромбі',
  'arrow-up-tail': 'Стрілка вгору із хвостом',
  'arrow-up-to-arc': 'Стрілка вгору до дуги',
  'arrow-left-circle': 'Стрілка вліво у колі',
  'arrow-left-square': 'Стрілка вліво у квадраті',
  'arrow-left-rhombus': 'Стрілка вліво у ромбі',
  'arrow-left-tail': 'Стрілка вліво із хвостом',
  'arrow-left-to-arc': 'Стрілка вліво до дуги',
  'arrow-left-right': 'Стрілка вліво-вправо',
  'arrow-right-circle': 'Стрілка вправо у колі',
  'arrow-right-left': 'Стрілка вправо-вліво',
  'arrow-right-square': 'Стрілка вправо у квадраті',
  'arrow-right-rhombus': 'Стрілка вправо у ромбі',
  'arrow-right-tail': 'Стрілка вправо із хвостом',
  'arrow-right-to-arc': 'Стрілка вправо до дуги',
  'arrow-autofit-content': 'Стрілка автопідбору вмісту',
  'arrow-autofit-down': 'Стрілка з автопідгоном вниз',
  'arrow-autofit-height': 'Стрілка автопідбору висоти',
  'arrow-autofit-left': 'Стрілка з автопідгоном вліво',
  'arrow-autofit-right': 'Стрілка з автопідгоном вправо',
  'arrow-autofit-up': 'Стрілка з автопідгоном вгору',
  'arrow-autofit-width': 'Стрілка автопідбору ширини',
  'arrow-big-down': 'Велика стрілка вниз',
  'arrow-big-down-line': 'Велика стрілка вниз з лінією',
  'arrow-big-down-lines': 'Велика стрілка вниз з лініями',
  'arrow-big-left': 'Велика стрілка вліво',
  'arrow-big-left-line': 'Велика стрілка вліво з лінією',
  'arrow-big-left-lines': 'Велика стрілка вліво з лініями',
  'arrow-big-right': 'Велика стрілка вправо',
  'arrow-big-right-line': 'Велика стрілка вправо з лінією',
  'arrow-big-right-lines': 'Велика стрілка вправо з лініями',
  'arrow-big-up': 'Велика стрілка вгору',
  'arrow-big-up-line': 'Велика стрілка вгору з лінією',
  'arrow-big-up-lines': 'Велика стрілка вгору з лініями',
  'box-model-2-off': 'Коробкова модель 2 (вимкнено)',
  'box-margin': 'Зовнішній відступ контейнера',
  'box-padding': 'Внутрішній відступ контейнера',
  'box-seam': 'Шов коробки',
  'bowl-chopsticks': 'Миска з паличками',
  'bowl-spoon': 'Миска з ложкою',
  'basket-bolt': 'Кошик із болтом',
  'basket-cancel': 'Кошик зі знаком скасування',
  'basket-check': 'Кошик із галочкою',
  'basket-code': 'Кошик із символом коду',
  'basket-cog': 'Кошик із шестернею',
  'basket-discount': 'Кошик зі знижкою',
  'basket-dollar': 'Кошик із символом долара',
  'basket-down': 'Кошик зі стрілкою вниз',
  'basket-exclamation': 'Кошик зі знаком оклику',
  'basket-heart': 'Кошик із серцем',
  'basket-minus': 'Кошик зі знаком мінус',
  'basket-pause': 'Кошик із символом паузи',
  'basket-pin': 'Кошик із позначкою розташування',
  'basket-plus': 'Кошик зі знаком плюс',
  'basket-question': 'Кошик зі знаком питання',
  'basket-search': 'Кошик із іконкою пошуку',
  'basket-share': 'Кошик із іконкою спільного доступу',
  'basket-star': 'Кошик із зіркою',
  'basket-up': 'Кошик зі стрілкою вгору',
  'basket-x': 'Кошик із хрестиком',
};

const directionReplacements: Array<[RegExp, string]> = [
  [/\bвліво вправо\b/giu, 'вліво-вправо'],
  [/\bвправо вліво\b/giu, 'вправо-вліво'],
  [/\bвгору вниз\b/giu, 'вгору-вниз'],
  [/\bвниз вгору\b/giu, 'вниз-вгору'],
  [/\bвліво вниз\b/giu, 'вліво-вниз'],
  [/\bвліво вгору\b/giu, 'вліво-вгору'],
  [/\bвправо вниз\b/giu, 'вправо-вниз'],
  [/\bвправо вгору\b/giu, 'вправо-вгору'],
  [/\bвниз ліворуч\b/giu, 'вниз-ліворуч'],
  [/\bвниз праворуч\b/giu, 'вниз-праворуч'],
  [/\bвгору ліворуч\b/giu, 'вгору-ліворуч'],
  [/\bвгору праворуч\b/giu, 'вгору-праворуч'],
];

const phraseReplacements: Replacement[] = [
  [/\bСтрілка велика\b/giu, 'Велика стрілка'],
  [/\bСтрілка маленька\b/giu, 'Маленька стрілка'],
  [/\bСтрілка подвійна\b/giu, 'Подвійна стрілка'],
  [/\bСтрілка автопідбір\b/giu, 'Стрілка автопідбору'],
  [/\bСтрілка автопідгонки\b/giu, 'Стрілка з автопідгоном'],
  [/\bСимвол пошуку\b/giu, 'Іконка пошуку'],
  [/\bСимвол коду\b/giu, 'Іконка коду'],
  [/\bСимвол серця\b/giu, 'Іконка серця'],
  [/\bСимвол зірки\b/giu, 'Іконка зірки'],
  [/\bСимвол спільного використання\b/giu, 'Іконка спільного доступу'],
  [/\bГвинтик\b/giu, 'Шестерня'],
  [/\bШпилька з розташуванням\b/giu, 'Позначка розташування'],
  [/Стрілка (вниз|вгору|вліво|вправо) коло/giu, (_match, dir) => `Стрілка ${dir} у колі`],
  [/Стрілка (вниз|вгору|вліво|вправо) квадрат/giu, (_match, dir) => `Стрілка ${dir} у квадраті`],
  [/Стрілка (вниз|вгору|вліво|вправо) ромб/giu, (_match, dir) => `Стрілка ${dir} у ромбі`],
  [/Стрілка (вниз|вгору|вліво|вправо) хвіст/giu, (_match, dir) => `Стрілка ${dir} із хвостом`],
  [/Стрілка (вниз|вгору|вліво|вправо) до дуги/giu, (_match, dir) => `Стрілка ${dir} до дуги`],
];

const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, ' ').replace(/\s([,.!?])/g, '$1').trim();

const squashDuplicateWords = (value: string) =>
  value.replace(/\b([\p{L}’']+)(\s+\1)+\b/giu, '$1');

const ensureOffSuffix = (key: string, value: string) => {
  if (!key.endsWith('-off')) {
    return value;
  }

  const cleaned = value
    .replace(/\(вимкнено\)/giu, '')
    .replace(/вимкн[а-яіїєґ]+/giu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${cleaned} (вимкнено)`;
};

const applyDirectionReplacements = (value: string) =>
  directionReplacements.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), value);

const applyPhraseReplacements = (value: string) =>
  phraseReplacements.reduce((acc, [pattern, replacement]) => {
    if (typeof replacement === 'string') {
      return acc.replace(pattern, replacement);
    }

    return acc.replace(pattern, (substring, ...matches) => replacement(substring, ...matches));
  }, value);

const normalize = (key: string, value: string) => {
  if (manualOverrides[key]) {
    return manualOverrides[key];
  }

  let result = normalizeWhitespace(value);
  result = squashDuplicateWords(result);
  result = applyDirectionReplacements(result);
  result = applyPhraseReplacements(result);
  result = ensureOffSuffix(key, result);

  // Робимо першу літеру великою, якщо вона була маленькою.
  if (result.length > 0) {
    result = result[0].toUpperCase() + result.slice(1);
  }

  return result;
};

const updatedEntries = Object.entries(translations).map(([key, value]) => [key, normalize(key, value)]) as Array<
  [string, string]
>;

const updatedTranslations = Object.fromEntries(updatedEntries);

writeFileSync(translationsPath, `${JSON.stringify(updatedTranslations, null, 2)}\n`, 'utf8');
