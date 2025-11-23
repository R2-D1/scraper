# Mediascrapper Iconify Tools

Набір незалежних скриптів для завантаження SVG-іконок з Iconify, роботи з перекладами та імпорту зображень з Unsplash. Основні сценарії:

- `pnpm run iconify:pull -- --collection <slug>` — завантажує колекцію, експортує SVG у `library/iconify/<slug>` та оновлює метадані і словники.
- `pnpm run iconify:update-translations [-- --collection <slug>]` — оновлює `icon-names.json` / `icon-keys.json` на основі словників без повторного завантаження SVG.
- `pnpm run unsplash:pull -- --url <https://unsplash.com/photos/...>` — завантажує зображення з Unsplash, зберігає його в `library/unsplash/<slug>` та створює `media-meta.json` із тегами.
- `pnpm run unsplash:pull-library [-- --file <path>]` — читає список URL зі звичайного текстового файлу (за замовчуванням `library/unsplash-library.txt`) і послідовно стягує всі фото, пропускаючи вже наявні. Рядки, вилучені зі списку, спричинять очищення відповідних папок у `library/unsplash`.
- `pnpm run images:update-translations [-- --slug <slug>]` — оновлює вже завантажені зображення за найсвіжішими перекладами тегів та назв і очищує списки `missing-*`.
- `pnpm run images:promote-missing` — переносить переклади з `translations/images/missing-*/part-XXXX.json` до майстер-файлів і очищує черги.
- `usp <https://unsplash.com/photos/...> [--out <шлях>] [--keep]` — короткий псевдонім до `unsplash:pull`, який приймає ті самі аргументи (перед першим запуском виконай `pnpm run cli:link`, щоб додати CLI у `PATH`).
- `pnpm run translations:cleanup` та `pnpm run translations:cleanup:keys` — корегують майстер-словники назв і ключів.
- `pnpm run synonyms:cleanup-missing` — очищує заявки на синоніми від заборонених значень.

Скрипти працюють з оновленою структурою даних: вся медіатека лежить у каталозі `library` (наприклад, `library/iconify`, `library/unsplash`), а переклади лежать у `translations`. Для іконок використовується структура `translations/icons/**` (майстер-файли в `icon-translations` та черги в `missing-*`), а для зображень з Unsplash — окрема зона `translations/images/` із файлами `name-translations.json`, `tag-translations.json`, шардованими каталогами `missing-name-translations`, `missing-tag-translations` та чорним списком `tag-blacklist.json` (див. `docs/translation-image-tags-task.md`). Для роботи Unsplash-скрипта необхідно задати `UNSPLASH_ACCESS_KEY` (та за потреби `UNSPLASH_SECRET_KEY`) у змінних середовища. Масовий імпорт URL ведемо у списку `library/unsplash-library.txt` — кожен рядок містить посилання, а команда `pnpm run unsplash:pull-library` автоматично стягує відсутні фото.
