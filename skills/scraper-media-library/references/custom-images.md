# Власні зображення

Процес має три незалежні етапи. Дозвіл на один не дозволяє наступний.

## Stage 1 — генерація та відбір

Починай лише за прямим запитом на Stage 1 і з наданими референсами. Нові референси лежать у `references/unprocessed/`; успішно опрацьовані — у `references/processed/`.

Для кожного референсу:

1. Проаналізуй жанр, композицію, світло, палітру, стилізацію, матеріали, атмосферу та головну візуальну ідею.
2. Сформуй короткий промпт одного цілісного кадру. Перед обов'язковим блоком нижче додай лише головний предмет, критичні елементи, прямі зміни користувача та те, що не можна відтворювати буквально.
3. Згенеруй нову самостійну фотографію в тому самому творчому напрямі, але не реконструкцію кадру.
4. Збережи обраний результат без апскейлу та manifest безпосередньо в `intake/custom-images/` і перевір, що це читабельне зображення.
5. Лише після успішного збереження перемісти конкретний референс у `references/processed/`. Невдалий залиш у `references/unprocessed/`.

Обов'язковий блок фінального промпта:

```text
Use the reference image closely and preserve its core visual idea, overall composition, framing, styling direction, mood, and the characteristics that make it visually appealing.

Create a clearly new photograph rather than a near-identical copy. Always replace the footwear, facial type and casting, eyewear, and hairstyle with new choices that fit the same creative direction. Do not merely recreate the same person and styling with insignificant variations.

Also introduce subtle, controlled changes to the camera angle, lighting, and pose when appropriate. These changes should be noticeable enough to give the photograph its own execution, but should not destroy the central concept, visual energy, or recognizable appeal of the reference.

Keep all substitutions and adjustments aesthetically coherent. Do not make arbitrary changes simply to create difference, and do not weaken the result by making it generic.

If the reference contains a visible brand or branded product, it may remain when natural or be replaced with a different real brand that fits the scene. Any brand must appear as an ordinary part of the photographed world and must not falsely imply an official collaboration, sponsorship, or endorsement.

The final image should preserve the reference’s strongest high-level qualities while using a different person, different key styling details, and a slightly different photographic execution.
```

На Stage 1 не апскейль, не чисть metadata, не створи manifest чи переклади, не запускай ingest, не читай бібліотеку, не готуй архів і не синхронізуй середовища. Після генерації зупинись для перегляду користувачем.

## Stage 2 — підготовка та локальний ingest

Починай лише після окремого схвалення конкретних кандидатів.

1. Апскейль кожен схвалений asset зі збереженням пропорцій: реальна довга сторона щонайменше 3840 px, бажано 4096 px.
2. Прибери EXIF, IPTC, XMP та ICC. Тимчасово тримай raw поза top-level intake; там не повинні одночасно лежати raw і 4K-копія одного asset.
3. Створи поруч `<image-file>.manifest.json` рівно з полями `title`, `category`, `collections`, `tags`, `pinned`.

```json
{
  "title": { "en": "Girl with laptop", "uk": "Дівчина з ноутбуком" },
  "category": "images",
  "collections": ["people", "technology"],
  "pinned": true,
  "tags": [
    { "en": "Person", "uk": "Людина" },
    { "en": "Portrait", "uk": "Портрет" },
    { "en": "People", "uk": "Люди" },
    { "en": "Studio", "uk": "Студія" },
    { "en": "Modern", "uk": "Сучасне" }
  ]
}
```

- `title`: природна людська назва EN і UK.
- `category`: `images` або `illustrations`.
- `collections`: непорожній масив унікальних slug з актуального реєстру за спільними правилами.
- `pinned`: явний boolean; `true` піднімає зображення над незапіненими, `false` знімає попередній pin при імпорті.
- `tags`: щонайменше п'ять релевантних пар EN/UK без випадкового перенасичення.
- Alt scraper формує з назви. Не додавай slug, ID, media key, prompt, source, author чи license: для звичайних Divnex-зображень їх формує scraper.

Потім послідовно запусти:

```text
pnpm run media:validate:custom-image-intake
pnpm run media:ingest:custom-images
pnpm run media:validate:custom-images
```

Звір кількість пар зі звітом ingest; перевір asset, 4K-розміри, очищені metadata, title, alt, category, усі колекції, source, author, license, localized tags і keywords. Повтори validation. Лише після успіху очисть файли саме обробленої пачки, не чіпаючи несхвалені кандидати, і лише за дозволом підготуй єдиний архів Unsplash і власних зображень командою `pnpm run media:prepare:images`. Вона повторно використовує готові оптимізовані файли та доробляє лише відсутні. `--clean` дозволений тільки після окремого прямого запиту користувача на повну регенерацію всієї бібліотеки.

Stage 2 нічого не надсилає на сервер.

## Готові сторонні колекції

Для невеликих сторонніх наборів склади всі asset-файли в окрему теку всередині `intake/custom-images/` і додай один `_collection.json`. Імпортер сам створює колекцію, стандартні записи бібліотеки, локалізує нові назви й теги через спільні словники та зберігає результат у категорії `library/custom-images/images/` або `library/custom-images/illustrations/`.

Обов'язкові поля `_collection.json`: `schemaVersion`, `collection.slug`, `collection.name.en`, `collection.name.uk`, `category`, `source`, `author`, `license`, `tags`, `pinned`. Необов'язковий `items` задає винятки за точною назвою файла: `title`, `tags`, `pinned`. Для нової колекції код змінювати не треба.

Запуск:

```text
pnpm run media:ingest:custom-images -- intake/custom-images/<collection-folder> --dry-run
pnpm run media:ingest:custom-images -- intake/custom-images/<collection-folder>
pnpm run media:validate:custom-images
```

Якщо DeepL недоступний, записи лишаються зі статусом `pending` і не потрапляють в експорт до успішного повторного ingest. Intake видаляй лише після перевірки результату й окремого дозволу користувача.

## Stage 3 — середовища

Порядок незмінний: Dev → Stage → Production. Перед кожним середовищем потрібне нове підтвердження.

```text
pnpm run media:sync:images -- --target dev --send --divnex-project <path-to-divnex2>
pnpm run media:sync:images -- --target stage --send --divnex-project <path-to-divnex2>
pnpm run media:sync:images -- --target prod --send --divnex-project <path-to-divnex2>
```

Після кожного запуску дочекайся кінцевого результату імпорту. Копіювання архіву чи запис у черзі не є доказом завершення. При будь-якій невдалій перевірці зупини поточний етап, не очищай intake і не переходь далі.
