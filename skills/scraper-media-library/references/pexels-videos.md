# Pexels: завантаження та підготовка відео

## Intake

- Джерело задається video-колекцією в живому `library/collections.json`; не дублюй її ID у коді.
- Запускай `pnpm run pexels:pull-videos`. Для smoke-пачки використовуй `-- --collection <slug> --limit-per-collection <n>`.
- Команда використовує офіційний Collection Media API з `type=videos`, дедуплікує за Pexels ID і зберігає ключ `pexels:video:<id>`.
- Обирається найякісніший готовий MP4, у якого довга сторона не перевищує 1920 px. 4K не завантажується; якщо придатного файла немає, asset потрапляє до rejected manifest.
- Відео зберігається без перекодування. Poster є окремим sidecar для бібліотечного preview.
- Якщо локальний MP4 для Pexels ID вже існує, повністю пропусти запис: не перезаписуй відео, poster, `media-meta.json`, колекції, теги чи статус. Нові ID спочатку дедуплікуй між колекціями й запиши всі їхні мапінги разом.

## Тегування та переклад

- Нове відео має `taggingStatus: pending` і не пакується до завершення локалізації.
- Створи пачку через `pnpm run pexels:tagging:sheets -- --collection <slug>`.
- Poster на contact sheet служить лише навігацією. Перед написанням назви й 4-8 англійських тегів переглянь саме відео за `reviewVideoPath` у JSON.
- Застосуй пачку через `pnpm run pexels:tagging:apply`, потім запусти `pnpm run images:update-translations -- --source pexels --pending-only --translate-missing`.

## Підготовка та sync

- Канонічна команда `pnpm run media:prepare:images --keep` копіює exact MP4 bytes і створює WebP poster, але не створює video variants і не оптимізує відео.
- Канонічний sync залишається `pnpm run media:sync:images`; план обмежує пакети одночасно кількістю assets і сумарними bytes.
- Dev, Stage і Production синхронізуються лише за окремим дозволом для кожного середовища.
