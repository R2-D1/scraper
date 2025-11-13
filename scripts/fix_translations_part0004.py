#!/usr/bin/env python3
import json
import re
from pathlib import Path


SRC = Path('translations/missing-translations/names/part-0004.json')


# Style tokens mapped to Ukrainian (shown in parentheses)
STYLE_MAP_GENERIC = {
    'outline': 'контурна',
    'line': 'контурна',
    'filled': 'заповнена',
    'fill': 'заповнена',
    'solid': 'суцільна',
    'thin': 'тонка',
    'light': 'тонка',  # will be overridden to "світлий" for brand logos
    'bold': 'жирна',
    'rounded': 'закруглена',
    'sharp': 'гостра',
    'duotone': 'двокольорова',
    'remix': 'remix',
    'dark': 'темний',
}


UPPER_ACRONYMS = {
    'pdf': 'PDF', 'ci': 'CI', 'ui': 'UI', 'vm': 'VM', 'js': 'JS', 'css': 'CSS', 'ios': 'iOS',
    'gcp': 'GCP', 'gh': 'GitHub', 'hbo': 'HBO', 'hbomax': 'HBO Max', 'hcl': 'HCL',
    'g2': 'G2', 'g2a': 'G2A', 'g2g': 'G2G',
}


# Basic dictionary for common nouns/actions (non-brands)
BASE_MAP = {
    # general
    'add': 'додати',
    'plus': 'додати',
    'remove': 'видалити',
    'minus': 'видалити',
    'delete': 'видалити',
    'open': 'відкрита',
    'close': 'закрита',
    'closed': 'закрита',
    'approved': 'схвалена',
    'favorite': 'вибране',
    'favourite': 'вибране',
    'import': 'імпортувати',
    'export': 'експортувати',
    'duplicate': 'дублювати',
    'modified': 'змінено',
    'moved': 'переміщено',
    'report': 'звіт',
    'print': 'друк',
    'loop': 'повтор',
    'off': 'вимкнено',
    'on': 'увімкнено',
    'circle': 'коло',
    'square': 'квадрат',
    'rectangle': 'прямокутник',
    'triangle': 'трикутник',
    'arrow': 'стрілка',
    'down': 'вниз',
    'up': 'вгору',
    'left': 'вліво',
    'right': 'вправо',
    'center': 'центр',
    'straight': 'прямий',
    'ltr': 'LTR',
    'rtl': 'RTL',
    'multiple': 'кілька',
    'placeholder': 'заповнювач',
    'secure': 'захищена',
    'search': 'пошук',
    'link': 'посилання',
    'home': 'домашня',
    'keys': 'ключі',
    'lock': 'замок',
    # subjects
    'file': 'файл',
    'folder': 'папка',
    'directory': 'папка',
    'flag': 'прапор',
    'film': 'плівка',
    'frame': 'кадр',
    'roll': 'котушка',
    'filter': 'фільтр',
    'fire': "полум'я",
    'fireworks': 'феєрверк',
    'rocket': 'ракета',
    'first': 'перша',
    'aid': 'допомога',
    'plaster': 'пластир',
    'quarter': 'чверть',
    'moon': 'місяць',
    'with': 'з',
    'face': 'обличчям',
    'fiscal': 'фіскальний',
    'host': 'хост',
    'fishes': 'риби',
    'fist': 'кулак',
    'fit': 'підігнати',
    'height': 'висота',
    'square': 'квадрат',
    'flat': 'плоский',
    'focus': 'фокус',
    'flower': 'квітка',
    'bud': 'брунька',
    'print': 'друк',
    'floppy': 'дискета',
    'disk': 'диск',
    'alert': 'попередження',
    'globe': 'глобус',
    'earth': 'земля',
    'grid': 'сітка',
    'timezone': 'часовий пояс',
    'hexagon': 'шестикутник',
    'gift': 'подарунок',
    'gear': 'шестерня',
    'gearshift': 'коробка передач',
    'car': 'авто',
    'gif': 'GIF',
    'format': 'формат',
    'go': 'назад',  # for "go back"
    'back': 'назад',
    'gallery': 'галерея',
    'collections': 'колекції',
    'gamepad': 'геймпад',
    'game': 'гра',
    'console': 'консоль',
    'cable': 'кабель',
    'garden': 'сад',
    'centre': 'центр',
    'camera': 'камера',
    'front': 'фронтальна',
    'full': 'повний',
    'fullscreen': 'повний екран',
    'enter': 'увійти',
    'function': 'функція',
    'argument': 'аргумент',
    'gender': 'гендерна',
    'equality': 'рівність',
    'generate': 'згенерувати',
    'contribution': 'внесок',
    'content': 'контент',
    'gentleman': 'джентльмен',
    'geo': 'гео',
    'point': 'точка',
    'active': 'активний',
    'gift': 'подарунок',
    'branch': 'гілка',
    'check': 'перевірка',
    'compare': 'порівняння',
    'merge': 'злиття',
    'queue': 'черга',
    'pull': 'витягнути',
    'beer': 'пиво',
    'water': 'вода',
    'grid': 'сітка',
    'three': 'три',
    'two': 'два',
    'four': 'чотири',
    'group': 'група',
    'meeting': 'зустріч',
    'call': 'дзвінок',
    'refresh': 'оновити',
    'repository': 'репозиторій',
    'resource': 'ресурс',
    'review': 'огляд',
    'robot': 'робот',
    'rules': 'правила',
    'sandbox': 'пісочниця',
    'search': 'пошук',
    'secure': 'захищена',
    'serverless': 'serverless',
    'shader': 'шейдер',
    'simulations': 'симуляції',
    'snippet': 'фрагмент',
    'stack': 'стек',
    'store': 'магазин',
    'template': 'шаблон',
    'television': 'телевізор',
    'tasks': 'завдання',
    'taskfile': 'Taskfile',
    'target': 'ціль',
    'theme': 'тема',
    'tools': 'інструменти',
    'trash': 'кошик',
    'trigger': 'тригер',
    'update': 'оновити',
    'types': 'типи',
    'typescript': 'TypeScript',
    'unity': 'Unity',
    'verdaccio': 'Verdaccio',
    'vue': 'Vue',
    'vuepress': 'VuePress',
    'vuex': 'Vuex',
    'react': 'React',
    'redux': 'Redux',
    'component': 'компоненти',
    'reducer': 'редʼюсер',
    'drag': 'перетягування',
    'grab': 'захоплення',
    'handle': 'ручка',
    'hand': 'рука',
    'handphone': 'телефон',
    'cursor': 'курсор',
    'pointer': 'вказівник',
    'event': 'подія',
    'tablet': 'планшет',
    'icons': 'іконки',
    'handshake': 'потиск рук',
    'hang': 'покласти',
    'up': 'вгору',
    'hard': 'жорсткий',
    'harddrive': 'жорсткий диск',
    'disk': 'диск',
    'download': 'завантажити',
    'hardware': '',  # опускаємо як зайве
    'computer': 'компʼютер',
    'game': 'гра',
    'headphones': 'навушники',
    'laptop': 'ноутбук',
    'microphone': 'мікрофон',
    'mobile': 'мобільний',
    'printer': 'принтер',
    'radio': 'радіо',
    'smart': 'розумний',
    'speaker': 'динамік',
    'watch': 'годинник',
    'tv': 'ТБ',
    'hash': 'решітка',
    'hashtag': 'хештег',
    'hat': 'капелюх',
    'tall': 'високий',
    'heading': 'заголовок',
    # food & kitchenware common
    'hat': 'капелюх', 'chef': 'кухар', 'toque': 'ковпак',
    'burger': 'бургер', 'cake': 'торт', 'candy': 'льодяник', 'cheese': 'сир', 'cherries': 'вишні',
    'beer': 'пиво', 'mug': 'кухоль', 'coffee': 'кава', 'tea': 'чай', 'cup': 'чашка', 'teapot': 'чайник',
    'milk': 'молоко', 'canister': 'бідон', 'cocktail': 'коктейль', 'shaker': 'шейкер',
}


ACTION_WORDS = {
    'add', 'plus', 'remove', 'minus', 'delete', 'print', 'import', 'export', 'refresh', 'update', 'search'
}


def is_brandish_token(tok: str) -> bool:
    # Heuristic: brands or proper names often contain no obvious translatable mapping
    if tok in ('file', 'folder', 'directory'):
        return False
    if tok in BASE_MAP:
        return False
    if re.match(r'^[a-z]+\d*$', tok) is None:
        return False
    # short or known vendor-like tokens
    return True


def titleize_token(tok: str) -> str:
    if tok in UPPER_ACRONYMS:
        return UPPER_ACRONYMS[tok]
    if tok.isnumeric():
        return tok
    # handle common vendor camel-less names: try to split on known substrings? keep simple
    return tok.capitalize()


from typing import List


def extract_style(tokens: List[str], context: List[str]) -> List[str]:
    styles = []
    remaining = []
    for t in tokens:
        if t in ('light', 'dark'):
            # Decide mapping for 'light'
            if t == 'light':
                # brand-ish two-word names like "gcp light", "github light", etc → світлий
                if len(context) <= 2 and all(is_brandish_token(x) for x in context if x != 'light'):
                    styles.append('світлий')
                else:
                    styles.append('тонка')
            else:
                styles.append('темний')
        elif t in STYLE_MAP_GENERIC:
            # Do not treat 'line' as a style in text-format context
            if t == 'line' and ('format' in context and 'text' in context):
                remaining.append(t)
                continue
            styles.append(STYLE_MAP_GENERIC[t])
        else:
            remaining.append(t)
    return remaining, styles


def join_with_style(base_uk: str, styles: List[str]) -> str:
    if styles:
        # deduplicate and preserve order
        uniq = []
        for s in styles:
            if s and s not in uniq:
                uniq.append(s)
        return f"{base_uk} (" + ', '.join(uniq) + ")"
    return base_uk


def translate_file(tokens: List[str]) -> str:
    tset = set(tokens)
    # Folder-like special case
    if 'directory' in tset or 'folder' in tset:
        # e.g., file directory open fill → Папка відкрита (заповнена)
        rest = [t for t in tokens if t not in ('file', 'directory', 'folder')]
        base = 'Папка'
        if 'open' in rest:
            base += ' відкрита'
            rest = [t for t in rest if t != 'open']
        if 'symlink' in rest:
            base += ' (символічне посилання)'
            rest = [t for t in rest if t != 'symlink']
        # remaining style tokens handled above; any other nouns ignored
        return base

    # Actions on file
    if 'export' in tset:
        return 'Експортувати файл'
    if 'import' in tset:
        return 'Імпортувати файл'
    if 'duplicate' in tset:
        return 'Дублювати файл'
    if 'plus' in tset or 'add' in tset:
        return 'Додати файл'
    if 'minus' in tset or 'remove' in tset or 'delete' in tset:
        return 'Видалити файл'
    if 'favorite' in tset or 'favourite' in tset:
        return 'Додати у вибране'
    if 'print' in tset:
        return 'Друк файлу'
    if 'modified' in tset:
        return 'Файл змінено'
    if 'moved' in tset:
        return 'Файл переміщено'
    if 'removed' in tset:
        return 'Файл видалено'
    if 'report' in tset:
        return 'Звіт'
    if 'loop' in tset:
        # enrich with circle/off variations later via styles/qualifiers
        base = 'Повтор'
        if 'circle' in tset:
            base += ' у колі'
        if 'off' in tset:
            base += ' (вимкнено)'
        if 'print' in tset:
            base += ' (друк)'
        return base
    # Fallback
    return 'Файл'


def is_action_word(tok: str) -> bool:
    return tok in ACTION_WORDS


def capitalize_phrase(words: List[str]) -> str:
    out = []
    for w in words:
        if w in BASE_MAP:
            mapped = BASE_MAP[w]
            if mapped:
                out.append(mapped)
        elif w in UPPER_ACRONYMS:
            out.append(UPPER_ACRONYMS[w])
        else:
            out.append(titleize_token(w))
    # Ensure first letter uppercase in final phrase
    phrase = ' '.join(out)
    if phrase:
        return phrase[0].upper() + phrase[1:]
    return phrase


def translate_folder(tokens: List[str]) -> str:
    # Remove leading 'folder'
    rest = [t for t in tokens if t != 'folder']

    # actions first
    rset = set(rest)
    if 'plus' in rset or 'add' in rset:
        base = 'Додати папку'
        rest = [t for t in rest if t not in ('plus', 'add')]
    elif 'minus' in rset or 'remove' in rset or 'delete' in rset:
        base = 'Видалити папку'
        rest = [t for t in rest if t not in ('minus', 'remove', 'delete')]
    elif 'multiple' in rset:
        base = 'Кілька папок'
        rest = [t for t in rest if t != 'multiple']
    elif 'search' in rset:
        base = 'Пошук у папці'
        rest = [t for t in rest if t != 'search']
    elif 'secure' in rset:
        base = 'Захищена папка'
        rest = [t for t in rest if t != 'secure']
    elif 'print' in rset:
        base = 'Друк папки'
        rest = [t for t in rest if t != 'print']
    elif 'placeholder' in rset:
        # folder placeholder ltr/rtl
        base = 'Заповнювач папки'
        rest = [t for t in rest if t != 'placeholder']
    else:
        base = 'Папка'

    # arrow directions
    if 'arrow' in rest:
        dir_word = ''
        if 'down' in rest:
            dir_word = 'вниз'
            rest.remove('down')
        elif 'left' in rest:
            dir_word = 'вліво'
            rest.remove('left')
        elif 'right' in rest:
            dir_word = 'вправо'
            rest.remove('right')
        elif 'up' in rest:
            dir_word = 'вгору'
            rest.remove('up')
        # remove arrow token
        rest = [t for t in rest if t != 'arrow']
        if dir_word:
            base += f" зі стрілкою {dir_word}"

    # brand/category qualifier (words before 'open' and not actions/styles)
    qualifier = []
    new_rest = []
    for t in rest:
        if t == 'file':
            # drop noise from patterns like "file folder approved"
            continue
        if t in ('open',):
            new_rest.append(t)
            continue
        if t in STYLE_MAP_GENERIC or is_action_word(t) or t in ('arrow', 'down', 'left', 'right', 'up'):
            new_rest.append(t)
        else:
            # treat as qualifier
            qualifier.append(t)
    rest = new_rest

    if qualifier:
        # Convert qualifier tokens to nice label
        # map via BASE_MAP if available, else Title Case (brand)
        words = []
        for q in qualifier:
            if q in BASE_MAP and BASE_MAP[q]:
                words.append(BASE_MAP[q])
            elif q in UPPER_ACRONYMS:
                words.append(UPPER_ACRONYMS[q])
            else:
                words.append(titleize_token(q))
        base += ' ' + ' '.join(words)

    if 'open' in rest:
        base += ' (відкрита)'
        rest = [t for t in rest if t != 'open']

    return base


def translate_generic(tokens: List[str]) -> str:
    tset = set(tokens)
    # Try some specific groups
    if 'flag' in tset:
        # країни, якщо присутні
        if 'france' in tset:
            return 'Прапор Франції'
        if 'germany' in tset:
            return 'Прапор Німеччини'
        if 'italy' in tset:
            return 'Прапор Італії'
        if 'russia' in tset:
            return 'Прапор Росії'
        if 'spain' in tset:
            return 'Прапор Іспанії'
        base = 'Прапор'
        if 'circle' in tset:
            base += ' у колі'
        if 'double' in tset:
            base = 'Подвійний прапор'
        if 'ltr' in tset:
            base += ' (LTR)'
        if 'rtl' in tset:
            base += ' (RTL)'
        if 'straight' in tset:
            base = 'Прямий прапор'
        return base

    if 'film' in tset:
        if 'roll' in tset:
            # e.g., film roll 1
            num = next((t for t in tokens if t.isdigit()), None)
            base = 'Котушка плівки'
            if num:
                base += f' {num}'
            return base
        if 'frame' in tset:
            base = 'Кадр плівки'
            if 'print' in tset:
                base += ' (друк)'
            if 'circle' in tset:
                base += ' (коло)'
            return base
        if 'movie' in tset:
            return 'Фільм'
        return 'Плівка'

    if 'filter' in tset:
        if 'video' in tset or 'media' in tset or 'play' in tset:
            return 'Фільтр відео'
        return 'Фільтр'

    if 'fire' in tset:
        base = "Полум'я"
        if 'circle' in tset:
            base += ' у колі'
        if 'off' in tset:
            base += ' (вимкнено)'
        if 'print' in tset:
            base += ' (друк)'
        if 'left' in tset:
            base += ' ліворуч'
        if 'station' in tset and 'jp' in tset:
            base = 'Пожежна станція (JP)'
        return base

    if 'first' in tset and 'aid' in tset and 'plaster' in tset:
        return 'Пластир'

    if 'first' in tset and 'quarter' in tset and 'moon' in tset:
        return 'Перша чверть місяця з обличчям'

    if 'first' in tset and 'contribution' in tset:
        return 'Перший внесок'

    if 'floppy' in tset:
        base = 'Дискета'
        num = next((t for t in tokens if t.isdigit()), None)
        if num:
            base += f' {num}'
        if 'alert' in tset:
            base += ' (попередження)'
        if 'circle' in tset:
            base += ' (коло)'
        return base

    if 'flower' in tset:
        if 'bud' in tset:
            base = 'Брунька'
            if 'circle' in tset:
                base += ' (коло)'
            return base
        base = 'Квітка'
        if 'circle' in tset:
            base += ' (коло)'
        return base

    if 'focus' in tset and 'center' in tset:
        return 'Фокус по центру'

    if 'front' in tset and 'camera' in tset:
        return 'Фронтальна камера'

    if 'full' in tset and 'moon' in tset and 'with' in tset and 'face' in tset:
        return 'Повний місяць з обличчям'

    if 'fullscreen' in tset and 'enter' in tset:
        return 'Увімкнути повний екран'

    if 'function' in tset and 'argument' in tset:
        if 'ltr' in tset:
            return 'Аргумент функції (LTR)'
        if 'rtl' in tset:
            return 'Аргумент функції (RTL)'
        return 'Аргумент функції'

    if 'funnel' in tset:
        if 'ltr' in tset:
            return 'Воронка (LTR)'
        if 'rtl' in tset:
            return 'Воронка (RTL)'
        return 'Воронка'

    if 'gamepad' in tset:
        # directions
        if 'down' in tset and 'left' in tset:
            return 'Геймпад вниз-ліворуч'
        if 'down' in tset and 'right' in tset:
            return 'Геймпад вниз-праворуч'
        if 'up' in tset and 'left' in tset:
            return 'Геймпад вгору-ліворуч'
        if 'up' in tset and 'right' in tset:
            return 'Геймпад вгору-праворуч'
        if 'center' in tset:
            return 'Геймпад центр'
        # numbered variants
        num = next((t for t in tokens if t.isdigit()), None)
        if num:
            return f'Геймпад {num}'
        return 'Геймпад'

    if 'gear' in tset and 'food' not in tset:
        base = 'Шестерня'
        if 'circle' in tset:
            base += ' у колі'
        return base

    if 'gift' in tset:
        base = 'Подарунок'
        if 'circle' in tset:
            base += ' у колі'
        return base

    if 'globe' in tset:
        if 'grid' in tset:
            base = 'Сітка глобуса'
            return base
        if 'earth' in tset:
            base = 'Земна куля'
            return base
        if 'timezone' in tset:
            base = 'Часовий пояс'
            return base
        return 'Глобус'

    if 'gif' in tset and 'format' in tset:
        return 'Формат GIF'

    if 'grab' in tset and 'handle' in tset:
        base = 'Ручка перетягування'
        if 'circle' in tset:
            base += ' у колі'
        return base

    if 'gramophone' in tset:
        return 'Грамофон'

    if 'graph' in tset:
        # increase/decrease
        if 'arrow' in tset and 'increase' in tset:
            return 'Графік зростання'
        if 'arrow' in tset and 'decrease' in tset:
            return 'Графік спаду'
        if 'bar' in tset and 'horizontal' in tset:
            return 'Стовпчиковий графік (горизонтальний)'
        if 'bar' in tset and 'vertical' in tset:
            return 'Стовпчиковий графік (вертикальний)'
        return 'Графік'

    # Food and kitchenware
    if 'food' in tset:
        # drinks
        if 'drinks' in tset and 'water' in tset and 'glass' in tset:
            return 'Склянка води'
        if 'drinks' in tset and 'wine' in tset and 'bottle' in tset:
            return 'Пляшка вина'
        if 'drinks' in tset and 'wine' in tset and 'glass' in tset:
            return 'Келих вина'
        if 'drinks' in tset and 'beer' in tset and 'mug' in tset:
            return 'Кухоль пива'
        if 'drinks' in tset and 'coffee' in tset and 'mug' in tset:
            return 'Кухоль кави'
        if 'drinks' in tset and 'tea' in tset and 'cup' in tset:
            return 'Чашка чаю'
        if 'drinks' in tset and 'teapot' in tset:
            return 'Чайник'
        if 'drinks' in tset and 'milk' in tset and 'canister' in tset:
            return 'Бідон молока'
        if 'drinks' in tset and 'cocktail' in tset and 'shaker' in tset:
            return 'Шейкер'
        if 'drinks' in tset and 'cocktail' in tset and 'glass' in tset:
            return 'Келих для коктейлю'
        if 'drinks' in tset and 'cocktail' in tset:
            return 'Коктейль'
        if 'toast' in tset:
            if 'breakfast' in tset:
                return 'Тост (сніданок)'
            if 'bread' in tset:
                return 'Тост із хліба'
            return 'Тост'
        if 'wheat' in tset:
            return 'Пшениця'
        if 'watermelon' in tset or ('water' in tset and 'melon' in tset):
            return 'Кавун'
        if 'pizza' in tset:
            return 'Піца'
        if 'popcorn' in tset:
            return 'Попкорн'
        if 'meat' in tset and 'chicken' in tset and ('drum' in tset or 'drumstick' in tset or ('drum' in tset and 'stick' in tset)):
            return 'Куряча ніжка'
        if 'fish' in tset:
            return 'Риба'
        if 'ice' in tset and 'cream' in tset:
            num = next((t for t in tokens if t.isdigit()), None)
            base = 'Морозиво'
            if num:
                base += f' {num}'
            if 'cone' in tset:
                base += ' (у ріжку)'
            return base
        if 'bowl' in tset and ('chopsticks' in tset or 'chop' in tset or 'stick' in tset):
            return 'Миска з паличками'
        if 'microwave' in tset:
            return 'Мікрохвильовка'
        if 'refrigerator' in tset or 'fridge' in tset:
            return 'Холодильник'
        if 'serving' in tset and 'dome' in tset:
            return 'Кришка для подачі'
        if 'chef' in tset and ('hat' in tset or 'toque' in tset):
            return 'Кухарський ковпак'
        if ('no' in tset or 'not' in tset) and 'allowed' in tset:
            return 'Їжа заборонена'
        if 'fork' in tset and 'spoon' in tset:
            return 'Вилка і ложка'
        if 'steak' in tset:
            if 'grill' in tset or 'bbq' in tset or 'barbecue' in tset:
                return 'Стейк на грилі'
            return 'Стейк'
        if 'burger' in tset:
            return 'Бургер'
        if 'cake' in tset:
            return 'Торт'
        if 'candy' in tset and 'cane' in tset:
            return 'Льодяник'
        if 'cheese' in tset:
            return 'Сир'
        if 'cherries' in tset or 'cherry' in tset:
            return 'Вишні'
        return 'Їжа'

    if 'football' in tset:
        return 'Футбол'

    if 'fork' in tset and 'spoon' in tset:
        return 'Вилка і ложка'

    if 'format' in tset and 'text' in tset:
        if 'multiline' in tset:
            return 'Формат тексту (багаторядковий)'
        if 'single' in tset and 'line' in tset:
            return 'Формат тексту (однорядковий)'
        return 'Формат тексту'

    if 'forward' in tset:
        base = 'Вперед'
        if 'end' in tset:
            base = 'Вперед до кінця'
        if 'circle' in tset:
            base += ' у колі'
        return base

    if 'full' in tset and 'cross' in tset and 'circle' in tset:
        return 'Хрест у колі'

    if 'garden' in tset and 'centre' in tset:
        return 'Садовий центр'

    if 'gallery' in tset and 'collections' in tset:
        return 'Галерея колекцій'

    if 'game' in tset and 'console' in tset and 'cable' in tset:
        return 'Кабель консолі'

    if 'go' in tset and 'back' in tset:
        return 'Назад'

    if 'group' in tset:
        if 'meeting' in tset and 'call' in tset:
            return 'Груповий дзвінок'
        if 'refresh' in tset:
            return 'Оновити групу'
        return 'Група'

    if 'hamburger' in tset:
        base = 'Бургер'
        if 'circle' in tset:
            base += ' у колі'
        return base

    if 'hammer' in tset:
        if 'drill' in tset:
            return 'Перфоратор'
        if 'claw' in tset:
            base = 'Цвяховий молоток'
        elif 'sledge' in tset:
            base = 'Кувалда'
        else:
            base = 'Молоток'
        if 'circle' in tset:
            base += ' у колі'
        return base

    if 'hand' in tset:
        if 'cursor' in tset:
            return 'Курсор руки'
        if 'grab' in tset:
            return 'Захоплення рукою'
        if 'hexagon' in tset:
            return 'Рука у шестикутнику'
        if 'open' in tset:
            base = 'Відкрита рука'
            if 'point' in tset:
                base = 'Вказівний жест'
            if 'circle' in tset:
                base += ' у колі'
            return base
        if 'point' in tset:
            base = 'Вказівник руки'
            if 'circle' in tset:
                base += ' у колі'
            return base
        if 'holding' in tset and 'dollar' in tset:
            return 'Рука з доларом'
        return 'Рука'

    if 'handphone' in tset:
        if 'laptop' in tset:
            return 'Телефон і ноутбук'
        if 'lock' in tset:
            return 'Телефон із замком'
        return 'Телефон'

    if 'harddrive' in tset or ('hard' in tset and 'disk' in tset):
        if 'download' in tset:
            return 'Завантажити на жорсткий диск'
        return 'Жорсткий диск'

    if 'hash' in tset or 'hastag' in tset:
        if 'hastag' in tset:
            base = 'Хештег'
        else:
            base = 'Решітка'
        if 'solid' in tset:
            return base + ' (суцільна)'
        if 'circle' in tset:
            base += ' у колі'
        if 'off' in tset:
            base += ' (вимкнено)'
        return base

    if 'hairy' in tset and 'creature' in tset:
        return 'Волохата істота'

    if 'heading' in tset:
        # heading 1/2/3
        num = next((t for t in tokens if t.isdigit()), None)
        if num:
            return f'Заголовок {num}'
        return 'Заголовок'

    if 'handshake' in tset:
        base = 'Потиск рук'
        if 'circle' in tset:
            base += ' у колі'
        if 'off' in tset:
            base += ' (вимкнено)'
        if 'print' in tset:
            base += ' (друк)'
        if 'protocol' in tset:
            base += ' протокол'
        return base

    if 'hang' in tset and 'up' in tset:
        num = next((t for t in tokens if t.isdigit()), None)
        base = 'Завершити дзвінок'
        if num:
            base += f' {num}'
        return base

    if 'hands' in tset and 'clapping' in tset:
        base = 'Оплески'
        if 'checkmark' in tset:
            base += ' з галочкою'
        if 'circle' in tset:
            base += ' у колі'
        if 'off' in tset:
            base += ' (вимкнено)'
        if 'print' in tset:
            base += ' (друк)'
        return base

    # Default: treat as brand or generic English phrase, Title Cased
    return capitalize_phrase(tokens)


def translate_value(en_value: str) -> str:
    tokens = en_value.split()
    # Extract styles first (needs full context)
    base_tokens, styles = extract_style(tokens, tokens)

    # file/folder first
    if 'folder' in base_tokens:
        base = translate_folder(base_tokens)
        return join_with_style(base, styles)
    if 'file' in base_tokens or 'directory' in base_tokens:
        base = translate_file(base_tokens)
        return join_with_style(base, styles)

    # Generic subjects
    base = translate_generic(base_tokens)
    return join_with_style(base, styles)


def main() -> None:
    data = json.loads(SRC.read_text(encoding='utf-8'))
    out = {}
    for k in data.keys():
        # Reconstruct the base English-like phrase from the key to avoid
        # re-processing already translated values.
        base_en = k.replace('-', ' ')
        uk = translate_value(base_en)
        out[k] = uk

    SRC.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding='utf-8')


if __name__ == '__main__':
    main()
