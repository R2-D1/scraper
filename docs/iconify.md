# Імпорт колекцій Iconify

Цей інструмент дозволяє вигрузити всі SVG-іконки з будь-якої публічної колекції Iconify та зберегти їх у локальну теку.

## Передумови

- Встановіть залежності після синхронізації репозиторію: `pnpm install`.
- Переконайтеся, що наявні пакети `@iconify/json` та `@iconify/tools` (встановлюються разом з іншими залежностями).

## Базовий приклад

```bash
pnpm run iconify:pull -- --collection tabler
```

Команда завантажить усі SVG з колекції `tabler` і збереже їх у `library/iconify/tabler/files`.

Після завершення в корені `library/iconify/<collection>` (на один рівень вище за `files`) зʼявиться кілька службових JSON-файлів:

- `collection-meta.json` — базова інформація про назву, slug, категорію та атрибути автора/ліцензії (потрібно для імпорту в БД).
- `icon-keys.json` — словник `{ "icon-name": ["ключові", "слова"] }`. Дані беруться з майстер-файлів перекладів і синонімів, а також з англомовних токенів колекції.
- `icon-names.json` — словник `{ "icon-name": "Назва" }`, що базується на оригінальних slug-ах (без стилевих/числових суфіксів). Значення одразу підставляються з майстер-файлу перекладів.
- `translations/icons/icon-translations/name-translations.json` — майстер-словник для назв іконок (ключ — базовий slug).
- `translations/icons/icon-translations/key-translations.json` — майстер-словник для окремих ключових слів.
- `translations/icons/icon-translations/synonyms.json` — майстер-файл синонімів (масив рядків для кожного токена).
- `translations/icons/missing-translations/names` та `translations/icons/missing-translations/keys` — шардовані списки токенів, для яких не знайдено переклад у майстер-файлах (формат `part-XXXX.json`).
- `translations/icons/missing-synonyms` — шардовані списки токенів без прописаних синонімів у майстер-файлі.

Приклад `collection-meta.json`:

```json
{
  "name": "Quill Icons",
  "slug": "quill",
  "category": "Іконки",
  "source": "https://icon-sets.iconify.design/quill/",
  "authorName": "Casper Lourens",
  "authorUrl": "https://www.figma.com/community/file/1034432054377533052/Quill-Iconset",
  "licenseName": "MIT",
  "licenseUrl": "https://github.com/yourtempo/tempo-quill-icons/blob/main/LICENSE"
}
```

> **Важливо.** Значення `slug` використовується як унікальний ідентифікатор колекції в БД, тому повторний імпорт із тим самим `slug` лише оновлює метадані без створення дубліката. Поле `category` повинно містити назву вже створеної категорії медіатеки (тип `ICON`); якщо назву не знайдено, імпорт завершиться помилкою.

Ключі `icon-keys.json` збираються з таких джерел:
- назви файлів (slug) іконок;
- теги та категорії, визначені в колекції;
- словника `translations/icons/icon-translations/key-translations.json`;
- синонімів із `translations/icons/icon-translations/synonyms.json`.

Назви `icon-names.json` формуються з `translations/icons/icon-translations/name-translations.json`: для кожного базового slug береться значення з майстер-файлу (якщо переклад не знайдено, тимчасово використовується англомовна людиночитна фраза).

Якщо колекція не містить додаткових метаданих, відповідні файли просто міститимуть порожні обʼєкти (`{}`) — це нормально. Атрибути автора та ліцензії задаються лише на рівні `collection-meta.json`.

## Робота зі словниками назв, ключових слів та синонімів

- Майстер-файли `translations/icons/icon-translations/name-translations.json`, `translations/icons/icon-translations/key-translations.json` та `translations/icons/icon-translations/synonyms.json` редагуються вручну й версіонуються в репозиторії. Скрипт лише читає їх.
- Після кожного запуску створюються каталоги `translations/icons/missing-translations/names`, `translations/icons/missing-translations/keys` та `translations/icons/missing-synonyms` (файли `part-XXXX.json`). Вони містять токени, яких не вистачає у відповідному майстер-файлі.
- Щоб додати переклад або синоніми, скопіюйте запис із `part-XXXX.json` до майстер-файлу та відредагуйте значення (наприклад, `"water": "вода"` чи `"water": ["вода", "аква"]`).
- Під час наступного запуску `pnpm run iconify:pull -- --collection <код>` скрипт одразу підставить оновлені значення в `icon-names.json` та `icon-keys.json`. Токени, які залишилися без перекладу, знову з’являться у відповідних `missing-*` каталогах.
- Числові токени (`"16"`, `"2024"` тощо) ігноруються — завжди потрапляють до метаданих як оригінал і не з’являються у списках `missing-*`.

### Рекомендований порядок дій

1. `pnpm run iconify:pull -- --collection <код>` — завантаження SVG, оновлення `icon-names.json`, `icon-keys.json` і генерація списків відсутніх перекладів/синонімів.
2. За потреби відредагуйте `translations/icons/missing-*` та перенесіть записи до майстер-файлів (`name-translations.json`, `key-translations.json`, `synonyms.json`).
3. Для застосування нових перекладів без повторного імпорту SVG запустіть `pnpm run iconify:update-translations -- --collection <код>`. Повторний `iconify:pull` потрібен лише тоді, коли треба заново стягнути файли з Iconify.

Каталоги `missing-*` повністю перезаписуються щоразу, тому в них завжди міститься актуальний список невирішених записів.

### Актуалізація перекладів для кількох колекцій

Команда `pnpm run iconify:update-translations` без аргументів проходить по всіх колекціях у `library/iconify` і перегенеровує `icon-names.json` та `icon-keys.json`, використовуючи найсвіжіші дані з `translations/icons/icon-translations`. Опційно можна вказати конкретну колекцію:

```bash
pnpm run iconify:update-translations -- --collection tabler
```

Під час виконання також оновлюються каталоги `translations/icons/missing-*`, тому нові або незаповнені токени одразу потрапляють до відповідних шардованих файлів.

## Додаткові параметри

- `--out <шлях>` — власна директорія, наприклад:
  ```bash
  pnpm run iconify:pull -- --collection mdi --out assets/icons/material
  ```
- `--keep` — не очищати теку перед записом (існуючі файли з такими ж назвами будуть перезаписані):
  ```bash
  pnpm run iconify:pull -- --collection heroicons-outline --keep
  ```

## Типові сценарії

- Потрібно швидко отримати всі іконки певного набору для перегляду чи імпорту в дизайн-систему.
- Необхідно сформувати локальний каталог із SVG-файлами для подальшої оптимізації чи ручного відбору.

## Обмеження

- Скрипт працює лише з колекціями, доступними у пакеті `@iconify/json`.
- Для інших наборів іконок, недоступних у Iconify, потрібно використовувати зовнішні інструменти.

## Синхронізація з публічною бібліотекою

1. Згенеруйте всі потрібні колекції командою `pnpm run iconify:pull -- --collection <код>` — структура `library/iconify/<slug>` уже міститиме `files/`, `icon-keys.json`, `icon-names.json` і оновлений `collection-meta.json`.
2. Запакуйте одну або кілька тек `iconify/<slug>` у ZIP-архів (зручніше виконати команду з каталогу `library`, щоб у архіві не було префікса `library/`). Приклад:
   ```bash
   cd library
   zip -r icon-archive.zip iconify/basil iconify/tabler
   ```
   > Імпорт також приймає архіви з префіксом `library/iconify/...` і автоматично обрізає зайвий сегмент шляху, тож можна завантажувати ті ж самі дані без додаткового перейменування.
3. У порталі (адмінка → «Публічна бібліотека») натисніть **«Синхронізувати іконки»** й оберіть підготовлений ZIP. API розпакує кожну колекцію, знайде категорію за назвою з `collection-meta.json` і:
   - створить нову колекцію з унікальним `slug`;
   - імпортує лише нові SVG-файли;
   - для колекцій із тим самим `slug` оновить метадані (назву, ліцензію, ключові слова) без повторного завантаження файлів.
4. Якщо вказана категорія відсутня, імпорт поверне помилку — створіть категорію в адмінці або змініть значення в `collection-meta.json`.
5. Повторний імпорт того самого архіву без змін не створить дублікатів: нові іконки будуть додані, а існуючі отримають лише оновлені переклади/ключові слова.
