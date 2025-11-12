# Mediascrapper Iconify Tools

Набір незалежних скриптів для завантаження SVG-іконок з Iconify, роботи з перекладами та імпорту зображень з Unsplash. Основні сценарії:

- `pnpm run iconify:pull -- --collection <slug>` — завантажує колекцію, експортує SVG у `library/iconify/<slug>` та оновлює метадані і словники.
- `pnpm run iconify:update-translations [-- --collection <slug>]` — оновлює `icon-names.json` / `icon-keys.json` на основі словників без повторного завантаження SVG.
- `pnpm run unsplash:pull -- --url <https://unsplash.com/photos/...>` — завантажує зображення з Unsplash, зберігає його в `library/unsplash/<slug>` та створює `media-meta.json` із тегами.
- `pnpm run translations:cleanup` та `pnpm run translations:cleanup:keys` — корегують майстер-словники назв і ключів.
- `pnpm run synonyms:cleanup-missing` — очищує заявки на синоніми від заборонених значень.

Скрипти працюють з оновленою структурою даних: вся медіатека лежить у каталозі `library` (наприклад, `library/iconify`, `library/unsplash`), а словники та шардовані списки перекладів — у каталозі `translations` (`translations/icon-translations`, `translations/missing-*`). Для роботи Unsplash-скрипта необхідно задати `UNSPLASH_ACCESS_KEY` (та за потреби `UNSPLASH_SECRET_KEY`) у змінних середовища.
