# unDraw SVG-ілюстрації

## Призначення

Окремий source-specific імпортер unDraw пише стандартні записи статичних ілюстрацій без проміжного intake. Використання дозволене на підставі окремого дозволу unDraw, отриманого власником проєкту.

## Запуск

- Тестова пачка: `pnpm run undraw:import -- --limit 3`.
- Увесь актуальний каталог: `pnpm run undraw:import -- --all`.
- Імпортер сам знаходить актуальний Next.js build ID, читає всі сторінки каталогу та завантажує прямі SVG з CDN.

## Колекція та metadata

- Записи живуть у `library/undraw/illustrations/<slug>/`.
- Кожен запис має рівно одну окрему колекцію `undraw-illustrations`.
- Джерело дає `_id`, англійську назву, slug і URL SVG. Назва формує name, alt і базові теги; відсутні переклади проходять спільний image translation flow.
- Автор: `unDraw`; ліцензія: `unDraw License`; category: `illustrations`; download source: `undraw`.
- Повторний імпорт зберігає наявний media key і перезаписує SVG та актуальні metadata.

## Перевірка

Перевір кількість, унікальні provider ID/media keys, самодостатність SVG, `complete`, локалізовані name/alt/tags і рівно одну колекцію `undraw-illustrations`. Повторний незмінений імпорт не повинен створювати дублікати.
