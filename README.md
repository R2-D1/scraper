# Mediascrapper Iconify Tools

Набір незалежних скриптів для завантаження SVG-іконок з Iconify, роботи з перекладами та імпорту зображень з Unsplash. Основні сценарії:

- `pnpm run iconify:pull -- --collection <slug>` — завантажує колекцію, експортує SVG у `library/iconify/<slug>` та оновлює метадані і словники.
- `pnpm run iconify:update-translations [-- --collection <slug>]` — оновлює `icons.json` (назви, ключові слова, `mediaKey`) на основі словників без повторного завантаження SVG.
- `pnpm run unsplash:pull-library [-- --file <path>]` — читає список URL зі звичайного текстового файлу (за замовчуванням `library/unsplash-library.txt`) і послідовно обробляє всі фото через Unsplash NAPI. Скрипт очікує, що відповідні файли вже лежать у `~/Downloads` (або власному каталозі, переданому через `--downloads`) і копіює їх у потрібні гілки бібліотеки.
- `pnpm run images:update-translations [-- --slug <slug>]` — оновлює вже завантажені зображення за найсвіжішими перекладами тегів та назв і очищує списки `missing-*`.
- `pnpm run images:promote-missing` — переносить переклади з `translations/images/missing-*/part-XXXX.json` до майстер-файлів і очищує черги.
- `pnpm run translations:cleanup` та `pnpm run translations:cleanup:keys` — корегують майстер-словники назв і ключів.
- `pnpm run synonyms:cleanup-missing` — очищує заявки на синоніми від заборонених значень.

Скрипти працюють з оновленою структурою даних: вся медіатека лежить у каталозі `library` (наприклад, `library/iconify`, `library/unsplash`), а переклади — у `translations`. Для іконок використовується структура `translations/icons/**` (майстер-файли в `icon-translations` та черги в `missing-*`), для зображень з Unsplash — зона `translations/images/` із файлами `name-translations.json`, шардованими каталогами `missing-name-translations`, `missing-tag-translations` та чорним списком `tag-blacklist.json` (див. `docs/translation-image-tags-task.md`). Спільний словник тегів для обох напрямів зберігається у `translations/tag-translations.json`. Масовий імпорт URL ведемо у списку `library/unsplash-library.txt` — кожен рядок містить посилання, а команда `pnpm run unsplash:pull-library` автоматично синхронізує бібліотеку, зчитує метадані через NAPI та копіює локальні скачування. Деякі допоміжні інструменти (наприклад, `unsplash:replace-downloads`) й надалі можуть вимагати `UNSPLASH_ACCESS_KEY` / `UNSPLASH_SECRET_KEY` у змінних середовища.

Щоб примусово визначити, в яку гілку (`images`, `Illustration` чи `patterns`) має потрапити конкретний медіафайл, додай його URL до одного з пріоритетних списків: `library/unsplash-illustrations-library.txt` або `library/unsplash-patterns-library.txt`. Записи з цих файлів мають вищий пріоритет за автоматичне визначення типу і також задають значення поля `category` (для patterns воно дорівнює «Патерни»).
