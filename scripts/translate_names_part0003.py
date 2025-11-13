#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Одноразовий скрипт для перекладу назв іконок у файлі:
  translations/missing-translations/names/part-0003.json

Підхід:
- Короткі, змістовні українські назви.
- Стилі/варіанти (solid, line, duotone, light, thin, rounded, sharp, circle, square, octagon, diamond, hexagon, simple тощо) вказуємо в дужках.
- Бренди/логотипи не перекладаємо — лише нормалізуємо написання; стиль (за наявності) теж у дужках.
- Категорійні префікси типу "content", "control", "controls", "controller", "devices", "device" не впливають на базовий зміст, тому ігноруються у побудові назви.
"""

import json
import re
from pathlib import Path

SRC = Path('translations/missing-translations/names/part-0003.json')

# Стилі (жіночий рід, щоб узгоджуватися з «іконка»)
STYLE_WEIGHTS = {
    'bold': 'жирна',
    'duotone': 'двоколірна',
    'light': 'тонка',
    'thin': 'тонка',
    'solid': 'суцільна',
    'outline': 'контурна',
    'line': 'контурна',
    'o': 'контурна',
    'dark': 'темна',
}

# Додаткові дескриптори форми/варіанту
STYLE_SHAPES = {
    'rounded': 'закруглена',
    'sharp': 'гостра',
    'circle': 'кругла',
    'square': 'квадратна',
    'octagon': 'восьмикутна',
    'diamond': 'ромбовидна',
    'hexagon': 'шестикутна',
    'oval': 'овальна',
    'simple': 'спрощена',
    'waves': 'хвиляста',
    # Не зовсім стиль, але корисно для відмінності варіантів
    'remix': 'remix',
    'alt': 'альтернативна',
    'empty': 'порожня',
}

# Категорійні слова, які ігноруємо при побудові базової назви
CATEGORY_PREFIXES = {
    'content', 'control', 'controls',
    'device', 'devices',
}

# Часті багатослівні фрази (спершу найбільш специфічні)
PHRASES = {
    # content-...
    ('content', 'confirm', 'file'): 'Файл з галочкою',
    ('content', 'confirm', 'folder'): 'Папка з галочкою',
    ('content', 'delete', 'file'): 'Видалити файл',
    ('content', 'delete', 'folder'): 'Видалити папку',
    ('content', 'remove', 'file'): 'Прибрати файл',
    ('content', 'remove', 'folder'): 'Прибрати папку',
    ('content', 'share'): 'Поділитися',
    ('content', 'video', 'off'): 'Відео вимкнено',
    ('content', 'video'): 'Відео',
    ('content', 'mute'): 'Без звуку',
    ('content', 'calendar'): 'Календар',
    ('content', 'clip'): 'Скріпка',
    ('content', 'clipboard'): 'Буфер обміну',
    ('content', 'crop'): 'Кадрування',
    ('content', 'dislike'): 'Дизлайк',
    ('content', 'edit'): 'Редагувати',
    ('content', 'file'): 'Файл',
    ('content', 'folder'): 'Папка',
    ('content', 'glasses'): 'Окуляри',
    ('content', 'heart'): 'Серце',
    ('content', 'image'): 'Зображення',
    ('content', 'like'): 'Лайк',
    ('content', 'pin'): 'Закріпити',
    ('content', 'print'): 'Друк',
    ('content', 'share', 'duotone'): 'Поділитися',
    ('content', 'share', 'light'): 'Поділитися',
    ('content', 'share', 'solid'): 'Поділитися',
    ('content', 'star'): 'Зірка',
    ('content', 'volume', 'high'): 'Гучність висока',

    # copy- / clipboard
    ('copy', 'to', 'clipboard'): 'Копіювати в буфер',
    ('copy', 'clipboard'): 'Копіювати в буфер',
    ('copy', 'paste'): 'Копіювати й вставити',

    # corner ... directions
    ('corner', 'down', 'left'): 'Кут вниз ліворуч',
    ('corner', 'down', 'right'): 'Кут вниз праворуч',
    ('corner', 'up', 'left'): 'Кут вгору ліворуч',
    ('corner', 'up', 'right'): 'Кут вгору праворуч',

    # credit-card ...
    ('credit', 'card', 'payment', 'machine'): 'Термінал оплати',
    ('credit', 'card', 'circle'): 'Банківська картка',
    ('credit', 'card'): 'Банківська картка',

    # data ...
    ('data', 'boolean'): 'Булеве значення',
    ('data', 'date'): 'Дата',
    ('data', 'numbers'): 'Числа',
    ('data', 'text'): 'Текст',
    ('data', 'transfer', 'download'): 'Передача даних (завантаження)',
    ('data', 'transfer', 'upload'): 'Передача даних (вивантаження)',

    # database ...
    ('database', 'server', '1'): 'Сервер бази даних',
    ('database', 'subtract', '1'): 'Відняти з бази даних',
    ('database', 'subtract'): 'Відняти з бази даних',
    ('database', 'lock'): 'База даних (замок)',
    ('database', 'refresh'): 'Оновити базу даних',
    ('database', 'remove'): 'Видалити з бази даних',
    ('database', 'setting'): 'Налаштування бази даних',
    ('database', 'check'): 'База даних (галочка)',
    ('database', 'circle'): 'База даних',

    # date-alt ...
    ('date', 'alt', 'add'): 'Дата додати',
    ('date', 'alt', 'check'): 'Дата галочка',
    ('date', 'alt', 'star'): 'Дата зірка',

    # desktop ...
    ('desktop', 'code'): 'Десктоп код',
    ('desktop', 'check'): 'Десктоп галочка',
    ('desktop', 'delete'): 'Десктоп видалити',
    ('desktop', 'dollar'): 'Десктоп долар',
    ('desktop', 'emoji'): 'Десктоп емодзі',
    ('desktop', 'favorite', 'star'): 'Десктоп зірка',
    ('desktop', 'game'): 'Десктоп гра',
    ('desktop', 'help'): 'Десктоп довідка',

    # devices ...
    ('devices', 'camera', 'off'): 'Камера вимкнена',
    ('devices', 'camera'): 'Камера',
    ('devices', 'computer'): 'Комп’ютер',
    ('devices', 'cpu'): 'Процесор',
    ('devices', 'database'): 'База даних',
    ('devices', 'hard', 'drive'): 'Жорсткий диск',
    ('devices', 'headphones'): 'Навушники',
    ('devices', 'keyboard'): 'Клавіатура',
    ('devices', 'laptop'): 'Ноутбук',
    ('devices', 'microphone', 'off'): 'Мікрофон вимкнено',
    ('devices', 'microphone'): 'Мікрофон',
    ('devices', 'mouse'): 'Миша',
    ('devices', 'phone'): 'Телефон',
    ('devices', 'plug'): 'Вилка',
    ('devices', 'smartwatch'): 'Смартгодинник',
    ('devices', 'tablet'): 'Планшет',
    ('devices', 'tv'): 'Телевізор',
    ('devices', 'video', 'games'): 'Ігрова приставка',

    # distribute ...
    ('distribute', 'horizontal', 'line'): 'Розподіл по горизонталі',
    ('distribute', 'vertical', 'line'): 'Розподіл по вертикалі',
    ('distribute', 'horizontal'): 'Розподіл по горизонталі',
    ('distribute', 'vertical'): 'Розподіл по вертикалі',

    # doc ...
    ('doc', 'changes'): 'Зміни в документі',
    ('doc', 'code'): 'Документ з кодом',
    ('doc', 'compressed'): 'Стиснений документ',
    ('doc', 'expand'): 'Розгорнути документ',
    ('doc', 'image'): 'Документ із зображенням',
    ('doc', 'new'): 'Новий документ',
    ('doc', 'symlink'): 'Символічне посилання (документ)',
    ('doc', 'versions'): 'Версії документа',

    # docked ...
    ('docked', 'left'): 'Прикріплене ліворуч',
    ('docked', 'right'): 'Прикріплене праворуч',
    ('docked', 'top'): 'Прикріплене вгорі',
    ('docked', 'bottom'): 'Прикріплене внизу',
    ('docked', 'detached'): 'Відкріплене',
    ('docked', 'takeover'): 'На весь екран',

    # dollar ...
    ('dollar', 'sign'): 'Знак долара',
    ('dollar', 'coin', '1'): 'Монета долар',
    ('dollar', 'circle'): 'Долар (у колі)',

    # door ...
    ('door', 'enter', 'line'): 'Вхід (двері)',
    ('door', 'exit', 'line'): 'Вихід (двері)',

    # dots grids
    ('dots', '2x2'): 'Крапки 2×2',
    ('dots', '2x3'): 'Крапки 2×3',
    ('dots', '3x2'): 'Крапки 3×2',
    ('dots', '3x3'): 'Крапки 3×3',
    ('dots', 'horizontal', 'line'): 'Крапки по горизонталі',
    ('dots', 'vertical', 'line'): 'Крапки по вертикалі',
    ('dots', 'x'): 'Крапки X',
    ('dots', 'y'): 'Крапки Y',

    # double chevron ...
    ('double', 'chevron', 'end', 'ltr'): 'Подвійний шеврон кінець (LTR)',
    ('double', 'chevron', 'end', 'rtl'): 'Подвійний шеврон кінець (RTL)',
    ('double', 'chevron', 'start', 'ltr'): 'Подвійний шеврон початок (LTR)',
    ('double', 'chevron', 'start', 'rtl'): 'Подвійний шеврон початок (RTL)',
    ('double', 'down', 'sign'): 'Подвійний знак вниз',
    ('double', 'left', 'sign'): 'Подвійний знак ліворуч',
    ('double', 'right', 'sign'): 'Подвійний знак праворуч',
    ('double', 'up', 'sign'): 'Подвійний знак вгору',
    ('cross', 'in', 'circle'): 'Хрест у колі',
    ('cross', 'in', 'circle', 'empty'): 'Хрест у порожньому колі',
    ('cross', 'reference'): 'Перехресне посилання',
    ('cross', 'arrow'): 'Хрестова стрілка',
    ('css', 'three'): 'CSS 3',
    ('creditcard', 'hand'): 'Картка в руці',
    ('database', 'data', 'transfer', 'computer', 'imac'): 'Передача даних на iMac',
    ('double', 'quote', 'serif', 'left'): 'Подвійні лапки (із засічками) ліворуч',
    ('double', 'quote', 'serif', 'right'): 'Подвійні лапки (із засічками) праворуч',
    ('door', 'box'): 'Двері (коробка)',
    ('delivery', 'package'): 'Посилка',
    ('delivery', 'package', 'open'): 'Відкрита посилка',
    ('descending', 'number', 'order'): 'Порядок чисел за спаданням',
    ('design', 'mug'): 'Кружка (дизайн)',
    ('dna', 'strand'): 'Ланцюг ДНК',
    ('debit', 'purchase'): 'Оплата дебетом',
    ('delete', 'collection'): 'Видалити колекцію',
    ('drag', 'squares', 'horizontal'): 'Перетягнути квадрати горизонтально',
    ('drag', 'squares', 'vertical'): 'Перетягнути квадрати вертикально',
    ('down', 'trend'): 'Нисхідний тренд',
    ('down', 'triangle'): 'Трикутник вниз',
    ('down', 'junction', 'sign'): 'Знак перехрестя вниз',
    ('down', 'direction'): 'Напрямок вниз',
    ('double', 'up', 'scroll', 'bar'): 'Подвійна смуга прокрутки вгору',
    ('down', 'up', 'scroll', 'bar'): 'Смуга прокрутки вниз-вгору',
    ('done', 'collection'): 'Завершена колекція',
    ('done', 'playlist'): 'Завершений плейлист',
    ('document', 'award'): 'Документ з нагородою',
    ('document', 'bookmark'): 'Документ із закладкою',
    ('discount', 'percent', 'badge'): 'Знижка (бейдж)',
    # circle варіант закриється стилем (кругла)
    ('discount', 'percent'): 'Знижка',
    ('scroll', 'bar'): 'Смуга прокрутки',
    ('editor', 'distribute', 'horizontal'): 'Розподіл по горизонталі',
    ('editor', 'distribute', 'vertical'): 'Розподіл по вертикалі',

    # control-buttons ...
    ('control', 'buttons', 'fast', 'forward'): 'Перемотка вперед',
    ('control', 'buttons', 'pause'): 'Пауза',
    ('control', 'buttons', 'play'): 'Відтворення',
    ('control', 'buttons', 'record'): 'Запис',
    ('control', 'buttons', 'rewind'): 'Перемотка назад',
    ('control', 'buttons', 'skip', 'back'): 'Пропустити назад',
    ('control', 'buttons', 'skip', 'forward'): 'Пропустити вперед',
    ('control', 'buttons', 'stop'): 'Стоп',

    # control-...
    ('control', 'forward'): 'Вперед',
    ('control', 'next'): 'Далі',
    ('control', 'pause'): 'Пауза',
    ('control', 'play'): 'Відтворення',
    ('control', 'rewind'): 'Перемотка',
    
    # Під цей файл: додаткові сталi фрази
    ('greatwall',): 'Велика китайська стіна',
    ('grin', 'tongue', 'wink'): 'Підморгування з язиком',
    ('health', 'card'): 'Медична картка',
    ('heat', 'map', 'stocks'): 'Теплова карта акцій',
    ('help', 'desk'): 'Служба підтримки',
    ('hight', 'beam', 'headlights'): 'Дальнє світло фар',
    ('hindi', 'to', 'chinese'): 'Гінді → Китайська',
    ('hinton', 'plot'): 'Діаграма Хінтона',
    ('history', 'anticlockwise'): 'Історія проти годинникової',
    ('hole', 'filling'): 'Заповнення дірки',
    ('hole', 'filling', 'cursor'): 'Курсор заповнення дірки',
    ('horizontal', 'align', 'center'): 'Вирівняти по центру (гор.)',
    ('horizontal', 'align', 'right'): 'Вирівняти праворуч (гор.)',
    ('horizontal', 'distribution', 'left'): 'Гор. розподіл ліворуч',
    ('horizontal', 'distribution', 'center'): 'Гор. розподіл по центру',
    ('horizontal', 'distribution', 'right'): 'Гор. розподіл праворуч',
    ('horizontal', 'view'): 'Горизонтальний вигляд',
    ('keyboard', 'brightness', 'high'): 'Яскравість клавіатури висока',
    ('keyboard', 'brightness', 'low'): 'Яскравість клавіатури низька',
    ('kubernetes', 'control', 'plane', 'node'): 'Kubernetes Control Plane Node',
    ('kubernetes', 'ip', 'address'): 'Kubernetes IP Address',
    ('kubernetes', 'operator'): 'Kubernetes Operator',
    ('kubernetes', 'pod'): 'Kubernetes Pod',
    ('kubernetes', 'worker', 'node'): 'Kubernetes Worker Node',
    ('kingkey', '100', 'tower'): 'Kingkey 100 Tower',
    ('launch', 'study'): 'Запустити дослідження',
    ('laurel', 'wreath'): 'Лавровий вінок',
    ('layer', 'group', 'slash'): 'Група шарів (перекреслено)',
    ('layers', 'external'): 'Зовнішні шари',
    ('layout', 'bottom', 'open'): 'Відкрити нижню панель',
    ('layout', 'bottom', 'close'): 'Закрити нижню панель',
    ('layout', 'top', 'open'): 'Відкрити верхню панель',
    ('layout', 'top', 'close'): 'Закрити верхню панель',
    ('layout', 'leftbar', 'open'): 'Відкрити ліву панель',
    ('layout', 'leftbar', 'close'): 'Закрити ліву панель',
    ('layout', 'rightbar', 'open'): 'Відкрити праву панель',
    ('layout', 'rightbar', 'close'): 'Закрити праву панель',
    ('left', 'arrow', 'from', 'left'): 'Стрілка вліво зліва',
    ('left', 'arrow', 'to', 'left'): 'Стрілка вліво',
    ('left', 'to', 'right', 'text', 'direction'): 'Напрямок тексту зліва направо',
    ('laptop', 'connection'): 'Підключення ноутбука',
    ('lemon', 'squeezy'): 'Lemon Squeezy',
    ('homepod', 'mini'): 'HomePod mini',
    ('ice', 'cream'): 'Морозиво',
    ('global', 'filters'): 'Глобальні фільтри',
    ('global', 'loan', 'and', 'trial'): 'Глобальні кредит і пробний період',
    ('graph', 'aggregator'): 'Агрегатор графа',
    ('graphical', 'data', 'flow'): 'Графічний потік даних',
    ('grip', 'dots'): 'Точки перетягування',
    ('grip', 'dots', 'vertical'): 'Точки перетягування вертикальні',
    ('group', 'access'): 'Груповий доступ',
    ('group', 'account'): 'Груповий обліковий запис',
    ('group', 'presentation'): 'Групова презентація',
    ('group', 'resource'): 'Груповий ресурс',
    ('group', 'security'): 'Групова безпека',
    ('group', 'objects', 'new'): 'Група обʼєктів — нова',
    ('group', 'objects', 'save'): 'Група обʼєктів — зберегти',
    ('hand', 'two', 'fingers'): 'Два пальці (рука)',
    ('handle', 'corner'): 'Маніпулятор кута',
    ('hanging', 'protocol'): 'Протокол розкладки',
    ('hardware', 'security', 'module'): 'Модуль апаратної безпеки',
    ('haze', 'night'): 'Імла вночі',
    ('heart', 'check'): 'Серце з галочкою',
    ('heart', 'minus'): 'Серце з мінусом',
    ('heart', 'plus'): 'Серце з плюсом',
    ('heart', 'x'): 'Серце з хрестиком',
    ('heart', 'slash'): 'Серце перекреслене',
    ('heart', 'dot'): 'Серце з точкою',
    ('heart', 'hand'): 'Рука з серцем',
    ('heart', 'home'): 'Дім із серцем',
    ('heart', 'user'): 'Серце користувача',
    ('grid', 'big', 'o'): 'Сітка велике O',
    ('grid', 'small', 'o'): 'Сітка мале O',
    ('heading', 'one'): 'Заголовок 1',
    ('heading', 'two'): 'Заголовок 2',
    ('heading', 'three'): 'Заголовок 3',
    ('heading', 'four'): 'Заголовок 4',
    ('heading', 'five'): 'Заголовок 5',
    ('heading', 'six'): 'Заголовок 6',
    ('layers', 'one'): 'Шари 1',
    ('layers', 'two'): 'Шари 2',
    ('layers', 'three'): 'Шари 3',
    ('left', 'small'): 'Мала стрілка ліворуч',
    # IBM конкретні виправлення написання
    ('ibm', 'cloud', 'ipsec', 'vpn'): 'IBM Cloud IPsec VPN',
    ('ibm', 'cloud', 'vpc', 'client', 'vpn'): 'IBM Cloud VPC Client VPN',
    ('ibm', 'cloud', 'citrix', 'daas'): 'IBM Cloud Citrix DaaS',
    ('ibm', 'cloud', 'app', 'id'): 'IBM Cloud App ID',
    ('load', 'balancer', 'application'): 'Балансувальник навантаження (застосунків)',
    ('load', 'balancer', 'classic'): 'Балансувальник навантаження (класичний)',
    ('load', 'balancer', 'global'): 'Балансувальник навантаження глобальний',
    ('load', 'balancer', 'listener'): 'Балансувальник навантаження: слухач',
}

# Бренди зі спец-написанням
BRAND_SPECIAL = {
    'contentlayer': 'Contentlayer',
    'contentstack': 'Contentstack',
    'conventionalcommits': 'Conventional Commits',
    'convertio': 'Convertio',
    'cookiecutter': 'Cookiecutter',
    'coolermaster': 'Cooler Master',
    'coolify': 'Coolify',
    'coop': 'Coop',
    'copaairlines': 'Copa Airlines',
    'copilot': 'Copilot',
    'coppel': 'Coppel',
    'cora': 'Cora',
    'coronaengine': 'Corona Engine',
    'coronarenderer': 'Corona Renderer',
    'corsair': 'Corsair',
    'counterstrike': 'Counter-Strike',
    'countingworkspro': 'CountingWorks PRO',
    'coze': 'Coze',
    'cplusplusbuilder': 'C++Builder',
    'craco': 'CRACO',
    'craftsman': 'Craftsman',
    'cratedb': 'CrateDB',
    'creality': 'Creality',
    'createreactapp': 'Create React App',
    'creativecommons': 'Creative Commons',
    'creativetechnology': 'Creative Technology',
    'creators': 'Creators',  # for creators-club -> combine
    'creators-club': 'Creators Club',
    'credly': 'Credly',
    'crehana': 'Crehana',
    'crewai': 'CrewAI',
    'crewunited': 'Crew United',
    'criticalrole': 'Critical Role',
    'cryptomator': 'Cryptomator',
    'cryptpad': 'CryptPad',
    'csdn': 'CSDN',
    'cssdesignawards': 'CSS Design Awards',
    'cssmodules': 'CSS Modules',
    'cyberdefenders': 'CyberDefenders',
    'cycling74': 'Cycling ’74',
    'cypress': 'Cypress',
    'cytoscapedotjs': 'Cytoscape.js',
    'd3': 'D3',
    'dacia': 'Dacia',
    'daf': 'DAF',
    'dailydotdev': 'daily.dev',
    'daimler': 'Daimler',
    'dapr': 'Dapr',
    'darkreader': 'Dark Reader',
    'dart': 'Dart',
    'darty': 'Darty',
    'daserste': 'Das Erste',
    'dask': 'Dask',
    'dassaultsystemes': 'Dassault Systèmes',
    'databricks': 'Databricks',
    'datacamp': 'DataCamp',
    'datadotai': 'data.ai',
    'dataiku': 'Dataiku',
    'datastax': 'DataStax',
    'dataverse': 'Dataverse',
    'datefns': 'date-fns',
    'datto': 'Datto',
    'davinciresolve': 'DaVinci Resolve',
    'dazhongdianping': 'Dazhong Dianping',
    'dcentertainment': 'DC Entertainment',
    'debian': 'Debian',
    'debridlink': 'Debrid-Link',
    'decapcms': 'Decap CMS',
    'decentraland': 'Decentraland',
    'deepcool': 'Deepcool',
    'deepgram': 'Deepgram',
    'deepl': 'DeepL',
    'deepmind': 'DeepMind',
    'deepnote': 'Deepnote',
    'deepsource': 'DeepSource',
    'deliveroo': 'Deliveroo',
    'delonghi': 'De’Longhi',
    'deluge': 'Deluge',
    'denizenscript': 'DenizenScript',
    'deno': 'Deno',
    'denon': 'Denon',
    'dependencycheck': 'Dependency-Check',
    'depositphotos': 'Depositphotos',
    'derspiegel': 'Der Spiegel',
    'deutschebahn': 'Deutsche Bahn',
    'deutschebank': 'Deutsche Bank',
    'deutschepost': 'Deutsche Post',
    'deutschetelekom': 'Deutsche Telekom',
    'deutschewelle': 'Deutsche Welle',
    'devbox': 'Devbox',
    'devdotto': 'DEV.to',
    'devexpress': 'DevExpress',
    'devpost': 'Devpost',
    'devto': 'DEV.to',
    'diagramsdotnet': 'diagrams.net',
    'discogs': 'Discogs',
    'discordbots': 'Discord Bots',
    'discorddotjs': 'discord.js',
    'discordjs': 'Discord.js',
    'directus': 'Directus',
    'dictionarydotcom': 'Dictionary.com',
    'die': 'кубик',
    'digikeyelectronics': 'Digi-Key Electronics',
    'dinophp': 'DinoPHP',
    'dior': 'Dior',
    'distrobox': 'Distrobox',
    'distrokid': 'DistroKid',
    'dji': 'DJI',
    'dlib': 'dlib',
    'dll': 'DLL',
    'dm': 'DM',
    'dmm': 'DMM',
    'doordash': 'DoorDash',
    'doubanread': 'Douban Read',
    'dota2': 'Dota 2',
    'docsdotrs': 'docs.rs',
    'docsify': 'Docsify',
    'customink': 'Custom Ink',
    'cv': 'CV',
    'cts': 'CTS',
    'contributorcovenant': 'Contributor Covenant',
    # Додано під цей файл
    'gohugo': 'Hugo',
    'gumroad': 'Gumroad',
    'homepod': 'HomePod',
    'humbleicon': 'Humbleicons',
}


def join_styles(styles):
    if not styles:
        return ''
    # унікалізація з збереженням порядку
    seen = set()
    uniq = []
    for s in styles:
        if s and s not in seen:
            seen.add(s)
            uniq.append(s)
    return ' (' + ', '.join(uniq) + ')' if uniq else ''


def cap(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s


def split_tokens_and_styles(key_tokens):
    styles = []
    base = []
    prev = None
    for idx, t in enumerate(key_tokens):
        if t in STYLE_WEIGHTS:
            styles.append(STYLE_WEIGHTS[t])
        elif t in STYLE_SHAPES:
            # Трактуємо контейнерні форми як стиль лише якщо вони НЕ є першим токеном
            # і не йдуть відразу після "in" (для фраз типу cross-in-circle).
            if idx > 0 and not (prev == 'in' and t in {'circle', 'square', 'hexagon', 'octagon', 'diamond'}):
                styles.append(STYLE_SHAPES[t])
            else:
                base.append(t)
        else:
            base.append(t)
        prev = t
    return base, styles


def detect_brand(key_tokens):
    # Бренд лише якщо є у спеціальній мапі (щоб не помилитися з загальними словами)
    if not key_tokens:
        return None
    k = '-'.join(key_tokens)
    if k in BRAND_SPECIAL:
        return BRAND_SPECIAL[k]
    head = key_tokens[0]
    if head in BRAND_SPECIAL:
        return BRAND_SPECIAL[head]
    return None


# Базова лексика для побудови коротких фраз
TOKEN_MAP = {
    # Загальні
    'global': 'глобальні',
    'globe': 'глобус',
    'wire': 'мережа',
    'glove': 'рукавичка',
    'graph': 'граф',
    'graphical': 'графічний',
    'data': 'дані',
    'flow': 'потік',
    'grass': 'трава',
    'grid': 'сітка',
    'bevel': 'скіс',
    'big': 'великий',
    'small': 'малий',
    'h': 'горизонтальна',
    'v': 'вертикальна',
    'grin': 'усмішка',
    'tongue': 'язик',
    'wink': 'підморгування',
    'grip': 'захват',
    'dots': 'крапки',
    'vertical': 'вертикальні',
    'group': 'група',
    'objects': 'обʼєкти',
    'new': 'нові',
    'save': 'зберегти',
    'presentation': 'презентація',
    'resource': 'ресурс',
    'security': 'безпека',
    'gui': 'GUI',
    'management': 'керування',
    'guitar': 'гітара',
    'hair': 'волосся',
    'hamburger': 'бургер',
    'hand': 'рука',
    'finger': 'палець',
    'fingers': 'пальці',
    'two': 'два',
    'grab': 'захопити',
    'handle': 'маніпулятор',
    'corner': 'кут',
    'hands': 'руки',
    'clapping': 'оплески',
    'hanging': 'розкладка',
    'protocol': 'протокол',
    'happy': 'усміхнений',
    'harddrive': 'жорсткий диск',
    'hardware': 'апаратний',
    'module': 'модуль',
    'hash': 'решітка',
    'haze': 'імла',
    'night': 'ніч',
    'head': 'голова',
    'heading': 'заголовок',
    'one': '1',
    'two': '2',
    'three': '3',
    'four': '4',
    'five': '5',
    'six': '6',
    'headphone': 'навушники',
    'slash': 'перекреслено',
    'health': 'медична',
    'card': 'картка',
    'check': 'галочка',
    'crack': 'тріщина',
    'dot': 'точка',
    'half': 'половина',
    'home': 'дім',
    'medical': 'медичне',
    'minus': 'мінус',
    'plus': 'плюс',
    'sign': 'знак',
    'user': 'користувач',
    'snooze': 'дрімота',
    'waves': 'хвилі',
    'x': 'хрестик',
    'heartbeat': 'пульс',
    'heat': 'теплова',
    'map': 'карта',
    'stocks': 'акції',
    'heavy': 'сильний',
    'rain': 'дощ',
    'rainstorm': 'злива',
    'snow': 'сніг',
    'snowstorm': 'снігопад',
    'help': 'служба',
    'desk': 'підтримки',
    'hemisphere': 'півкуля',
    'hexagon': 'шестикутник',
    'hexagons': 'шестикутники',
    'vertical': 'вертикальний',
    'high': 'висока',
    'temperature': 'температура',
    'voltage': 'напруга',
    'power': 'живлення',
    'hight': 'дальнє',
    'beam': 'світло',
    'headlights': 'фари',
    'hindi': 'Гінді',
    'chinese': 'Китайська',
    'plot': 'діаграма',
    'history': 'історія',
    'anticlockwise': 'проти годинникової',
    'hl7': 'HL7',
    'hoe': 'мотика',
    'hole': 'дірка',
    'filling': 'заповнення',
    'cursor': 'курсор',
    'homepod': 'HomePod',
    'mini': 'mini',
    'hood': 'капот',
    'horizontal': 'горизонтальний',
    'align': 'вирівняти',
    'distribution': 'розподіл',
    'center': 'центр',
    'right': 'праворуч',
    'left': 'ліворуч',
    'view': 'вигляд',
    'horn': 'гудок',
    'hotkey': 'гарячі клавіші',
    'hours': 'години',
    'house': 'будинок',
    'html': 'HTML',
    'humidity': 'вологість',
    'hunting': 'полювання',
    'hybrid': 'гібридний',
    'networking': 'мережа',
    'ica': 'ICA',
    'ice': 'лід',
    'cream': 'морозиво',
    'vision': 'Vision',
    'id': 'ID',
    'management': 'керування',
    'idcard': 'посвідчення',
    'if': 'if',
    'action': 'дія',
    'illustration': 'ілюстрація',
    'imac': 'iMac',
    'image': 'зображення',
    'alt': 'альтернативна',
    'block': 'блок',
    'rectangle': 'прямокутник',
    'redo': 'повторити',
    'reference': 'посилання',
    'resize': 'зміна розміру',
    'landscape': 'альбомна',
    'search': 'пошук',
    'service': 'сервіс',
    'share': 'поділитися',
    'shield': 'щит',
    'store': 'зберегти',
    'local': 'локально',
    'import': 'імпорт',
    'export': 'експорт',
    'improve': 'покращити',
    'relevance': 'релевантність',
    'in': 'в',
    'progress': 'процесі',
    'error': 'помилка',
    'warning': 'попередження',
    'inbox': 'вхідні',
    'archive': 'архівувати',
    'down': 'вниз',
    'up': 'вгору',
    'plus': 'плюс',
    'x': 'хрестик',
    'incident': 'інцидент',
    'reporter': 'звітування',
    'incognito': 'інкогніто',
    'mode': 'режим',
    'complete': 'завершено',
    'incomplete': 'незавершено',
    'cancel': 'скасовано',
    'increase': 'підвищити',
    'level': 'рівень',
    'indent': 'відступ',
    'decrease': 'зменшити',
    'increase': 'збільшити',
    'indifferent': 'нейтральне',
    'infinity': 'нескінченність',
    'symbol': 'символ',
    'info': 'інфо',
    'infrastructure': 'інфраструктура',
    'injection': 'інʼєкція',
    'ins': 'вставка',
    'insert': 'вставити',
    'page': 'сторінку',
    'syntax': 'синтаксис',
    'inspect': 'інспектувати',
    'instance': 'інстанс',
    'virtual': 'віртуальний',
    'instrument': 'інструмент',
    'intent': 'намір',
    'request': 'запит',
    'active': 'активна',
    'heal': 'відновити',
    'scale': 'масштаб',
    'out': 'збільшити',
    'uninstall': 'видалити',
    'upgrade': 'оновити',
    'interactions': 'взаємодії',
    'interactive': 'інтерактивна',
    'segmentation': 'сегментація',
    'interface': 'інтерфейс',
    'definition': 'визначення',
    'usage': 'використання',
    'intersect': 'перетин',
    'intrusion': 'вторгнення',
    'prevention': 'запобігання',
    'inventory': 'запаси',
    'invite': 'запрошення',
    'iot': 'IoT',
    'item': 'елемент',
    'jackhammer': 'відбійний молоток',
    'jeep': 'джип',
    'job': 'завдання',
    'daemon': 'фоновий процес',
    'run': 'запуск',
    'join': 'обʼєднання',
    'inner': 'внутрішнє',
    'outer': 'зовнішнє',
    'node': 'вузол',
    'js': 'JS',
    'json': 'JSON',
    'jump': 'швидке',
    'link': 'посилання',
    'key': 'ключ',
    'keyboard': 'клавіатура',
    'brightness': 'яскравість',
    'keyhole': 'замкова щілина',
    'keyword': 'ключове слово',
    'list': 'список',
    'checked': 'позначено',
    'collapse': 'згорнути',
    'dropdown': 'випадаючий',
    'expansion': 'розгортання',
    'number': 'число',
    'numbered': 'нумерований',
    'ordered': 'нумерований',
    'mirror': 'дзеркально',
    'live': 'наживо',
    'location': 'локація',
    'photo': 'фото',
    'load': 'навантаження',
    'balancer': 'балансувальник',
    'application': 'застосунок',
    'kingkey': 'Kingkey',
    'tower': 'Tower',
    'kiosk': 'кіоск',
    'kite': 'повітряний змій',
    'kubernetes': 'Kubernetes',
    'control': 'керування',
    'plane': 'площина',
    'ip': 'IP',
    'address': 'адреса',
    'operator': 'оператор',
    'pod': 'pod',
    'worker': 'робітник',
    'ladder': 'драбина',
    'lamp': 'лампа',
    'lantern': 'ліхтар',
    'laptop': 'ноутбук',
    'connection': 'підключення',
    'large': 'велика',
    'arrow': 'стрілка',
    'laugh': 'сміх',
    'launch': 'запустити',
    'study': 'дослідження',
    'laurel': 'лавровий',
    'wreath': 'вінок',
    'layer': 'шар',
    'layers': 'шари',
    'slash': 'перекреслено',
    'layout': 'макет',
    'bottom': 'нижня панель',
    'top': 'верхня панель',
    'leftbar': 'ліва панель',
    'rightbar': 'права панель',
    'open': 'відкрити',
    'close': 'закрити',
    'leaf': 'листок',
    'leaves': 'листя',
    'legend': 'легенда',
    'lemon': 'Lemon',
    'squeezy': 'Squeezy',
    'leo': 'Лев',
    'letter': 'літера',
    'english': 'Англійська',
    'chinese': 'Китайська',
    'japanese': 'Японська',
    'calendar': 'календар',
    'clip': 'скріпка',
    'clipboard': 'буфер обміну',
    'confirm': 'підтверджено',
    'crop': 'кадрування',
    'delete': 'видалити',
    'remove': 'прибрати',
    'dislike': 'дизлайк',
    'edit': 'редагувати',
    'file': 'файл',
    'folder': 'папка',
    'glasses': 'окуляри',
    'heart': 'серце',
    'image': 'зображення',
    'like': 'лайк',
    'mute': 'без звуку',
    'pin': 'закріпити',
    'print': 'друк',
    'share': 'поділитися',
    'star': 'зірка',
    'video': 'відео',
    'volume': 'гучність',
    'high': 'висока',
    'low': 'низька',
    'medium': 'середня',
    'off': 'вимкнено',

    'context': 'контекст',
    'convenience': 'зручність',
    'continuity': 'продовження',
    'above': 'зверху',
    'below': 'знизу',
    'within': 'всередині',
    'contract': 'згорнути',

    'controller': 'контролер',
    'controls': 'керування',

    'convert': 'конвертувати',
    'pdf': 'PDF',
    'cookie': 'печиво',
    'copywriting': 'копірайтинг',

    'copy': 'копіювати',
    'paste': 'вставити',
    'to': 'в',
    'ltr': 'LTR',
    'rtl': 'RTL',

    # Курсор/стрілки й вибір
    'cursor': 'курсор',
    'arrow': 'стрілка',
    'target': 'ціль',
    'choose': 'вибір',
    'select': 'виділити',
    'area': 'область',
    'question': 'питання',
    'curve': 'вигнута',
    'click': 'клік',
    'cut': 'вирізати',
    'in': 'в',
    'reference': 'посилання',

    'corner': 'кут',
    'up': 'вгору',
    'down': 'вниз',
    'left': 'ліворуч',
    'right': 'праворуч',

    'countdown': 'зворотний відлік',
    'covid': 'COVID',
    'exclamation': 'оклику',
    'create': 'створити',
    'note': 'нотатку',
    'credits': 'кредити',

    'credit': 'картка',  # разом з 'card' -> буде «картка»; див. PHRASES
    'card': 'картка',
    'payment': 'оплата',
    'machine': 'термінал',

    'data': 'дані',
    'boolean': 'булеве',
    'date': 'дата',
    'numbers': 'числа',
    'text': 'текст',
    'transfer': 'передача',
    'download': 'завантаження',
    'upload': 'вивантаження',
    'database': 'база даних',
    'server': 'сервер',
    'lock': 'замок',
    'refresh': 'оновити',
    'remove': 'видалити',
    'setting': 'налаштування',
    'check': 'галочка',

    'day': 'день',
    'cloud': 'хмара',
    'storm': 'буря',

    'desktop': 'десктоп',
    'code': 'код',
    'emoji': 'емодзі',
    'favorite': 'улюблене',
    'game': 'гра',
    'help': 'довідка',

    'device': 'пристрій',
    'camera': 'камера',
    'computer': 'комп’ютер',
    'cpu': 'процесор',
    'hard': 'жорсткий',
    'drive': 'диск',
    'headphones': 'навушники',
    'keyboard': 'клавіатура',
    'laptop': 'ноутбук',
    'microphone': 'мікрофон',
    'mouse': 'миша',
    'phone': 'телефон',
    'plug': 'вилка',
    'smartwatch': 'смартгодинник',
    'tablet': 'планшет',
    'tv': 'телевізор',
    'video': 'відео',
    'games': 'ігри',

    'diagram': 'діаграма',
    'bar': 'стовпчикова',
    'diamonds': 'бубни',
    'symbol': 'символ',
    'diameter': 'діаметр',
    'decrease': 'зменшення',
    'delivery': 'доставка',
    'package': 'посилка',
    'open': 'відкрита',
    'descending': 'спадання',
    'number': 'число',
    'order': 'порядок',
    'design': 'дизайн',
    'mug': 'кружка',
    'dialogue': 'діалог',

    'dice': 'кубик',
    'active': 'активний',

    'disappointed': 'розчароване',
    'but': '',
    'relieved': 'полегшене',
    'face': 'обличчя',

    'doc': 'документ',
    'docked': 'прикріплене',

    'document': 'документ',
    'award': 'нагорода',
    'bookmark': 'закладка',
    'versions': 'версії',

    'dog': 'собака',
    'park': 'майданчик',

    'dollar': 'долар',
    'sign': 'знак',
    'coin': 'монета',

    'domain': 'домен',

    'donut': 'пончик',

    'door': 'двері',
    'enter': 'вхід',
    'exit': 'вихід',
    'box': 'коробка',

    'dot': 'крапка',
    'fill': 'заповнена',
    'octagon': 'восьмикутник',
    'hexagon': 'шестикутник',
    'diamond': 'ромб',
    'square': 'квадрат',
    'circle': 'коло',

    'dots': 'крапки',
    'horizontal': 'горизонтальні',
    'vertical': 'вертикальні',
    'x': 'X',
    'y': 'Y',

    'double': 'подвійний',
    'chevron': 'шеврон',
    'end': 'кінець',
    'start': 'початок',
    'sign': 'знак',
    'quote': 'лапки',
    'serif': 'із засічками',

    'scroll': 'прокрутка',

    'direction': 'напрямок',
    # спец-токени
    'creditcard': 'картка',
    'cube': 'куб',
    'cup': 'чашка',
    'curly': 'фігурні',
    'braces': 'дужки',
    'brackets': 'дужки',
    'dashboard': 'панель',
    'imac': 'iMac',
    'cross': 'хрест',
    'crown': 'корона',
    'crystal': 'кристал',
    'css': 'CSS',
    'three': 'три',
    'dangerous': 'небезпечна',
    'zone': 'зона',
    'delta': 'дельта',
    'dependencies': 'залежності',
    'update': 'оновлення',
    'deployments': 'розгортання',
    'details': 'деталі',
    'block': 'блок',
    'mobile': 'мобільний',
    'editor': 'редактор',
    'distribute': 'розподіл',
    'triangle': 'трикутник',
    'trend': 'тренд',
    'junction': 'перехрестя',
    'downloaded': 'завантажено',
    'squares': 'квадрати',
    'drag': 'перетягнути',
    'discount': 'знижка',
    'percent': 'відсоток',
    'badge': 'бейдж',
    'discussion': 'обговорення',
    'closed': 'закрито',
    'duplicate': 'дублікат',
    'outdated': 'застаріле',
    'distorted': 'спотворене',
    'division': 'ділення',
    'dna': 'ДНК',
    'strand': 'нитка',
    'doctex': 'DocTeX',
    'installer': 'встановлювач',
    'doi': 'DOI',
}


def tokens_to_phrase(tokens):
    # 1) Пошук фразових відповідників від довших до коротших
    for n in range(len(tokens), 0, -1):
        key = tuple(tokens[:n])
        if key in PHRASES:
            return PHRASES[key]

    # 2) Побудова з токенів через лексичну мапу
    words = []
    # об'єднаємо патерни 2x2 / 3x3 як один токен (для ключів dots-2x2 тощо)
    merged = []
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if i + 2 < len(tokens) and re.fullmatch(r'\d+', tokens[i]) and tokens[i+1] == 'x' and re.fullmatch(r'\d+', tokens[i+2]):
            merged.append(tokens[i] + 'x' + tokens[i+2])
            i += 3
            continue
        merged.append(t)
        i += 1

    letter_mode = 'letter' in tokens
    for t in merged:
        if t in CATEGORY_PREFIXES:
            continue
        # Літери A..Z та подвоєні — лише для сімейства letter-*
        if letter_mode and re.fullmatch(r'[a-z]', t):
            w = t.upper()
        elif letter_mode and re.fullmatch(r'[a-z]{2}', t):
            w = t.upper()
        else:
            w = TOKEN_MAP.get(t, t)
        if w:
            words.append(w)

    if not words:
        return ''

    # Зібрати коротку фразу; дрібні службові токени могли зникнути
    phrase = ' '.join(words)
    # Нормалізуємо подвоєні пробіли
    phrase = ' '.join(phrase.split())
    # Капіталізація першої літери
    return cap(phrase)


def translate_key(key: str) -> str:
    raw_tokens = key.split('-')
    # Спроба точного збігу фрази за сирими токенами (до відокремлення стилів)
    raw_phrase = None
    for n in range(len(raw_tokens), 0, -1):
        tup = tuple(raw_tokens[:n])
        if tup in PHRASES:
            raw_phrase = PHRASES[tup]
            break

    base_tokens, styles = split_tokens_and_styles(raw_tokens)

    # Бренд?
    brand = detect_brand(base_tokens)

    # Додаткові стилі за прапорцями у базових токенах
    extra_style_flags = []
    if 'off' in base_tokens:
        extra_style_flags.append('вимкнено')
        base_tokens = [t for t in base_tokens if t != 'off']
    if 'print' in base_tokens and raw_phrase is None:
        extra_style_flags.append('для друку')
        base_tokens = [t for t in base_tokens if t != 'print']
    if 'active' in base_tokens:
        extra_style_flags.append('активна')
        base_tokens = [t for t in base_tokens if t != 'active']

    # Спец-обробка для IBM: не перекладаємо, нормалізуємо регістр/акроніми
    def _ibm_english_title(tokens):
        res = []
        i = 0
        while i < len(tokens):
            t = tokens[i]
            # Обʼєднати z + os -> z/OS
            if t == 'z' and i + 1 < len(tokens) and tokens[i+1] == 'os':
                res.append('z/OS')
                i += 2
                continue
            # Акроніми та особливі написання
            upper_map = {
                'api': 'API', 'db2': 'Db2', 'mq': 'MQ', 'hpc': 'HPC', 'hsm': 'HSM',
                'ipsec': 'IPsec', 'vpc': 'VPC', 'vs': 'VS', 'saas': 'SaaS', 'b2b': 'B2B',
                'aiops': 'AIOps', 'pal': 'PAL', 'lpa': 'LPA', 'lqe': 'LQE', 'jrs': 'JRS',
                'gcm': 'GCM'
            }
            proper_map = {
                'cloud': 'Cloud', 'cloudant': 'Cloudant', 'watson': 'Watson', 'watsonx': 'watsonx',
                'webmethods': 'webMethods', 'openshift': 'OpenShift', 'instana': 'Instana',
                'maximo': 'Maximo', 'netezza': 'Netezza', 'turbonomic': 'Turbonomic',
                'kubernetes': 'Kubernetes'
            }
            if t in upper_map:
                res.append(upper_map[t])
            elif t in proper_map:
                res.append(proper_map[t])
            else:
                res.append(t.capitalize())
            i += 1
        return ' '.join(res)

    # Побудувати базову фразу (або бренд)
    if raw_tokens and raw_tokens[0] == 'ibm':
        # для IBM: якщо є точна фраза — використовуємо її; інакше тайтл-кейс
        if raw_phrase is not None:
            name = raw_phrase
        else:
            name = 'IBM ' + _ibm_english_title([t for t in base_tokens if t != 'ibm'])
    else:
        name = brand if brand else (raw_phrase if raw_phrase is not None else tokens_to_phrase(base_tokens))
    if not name:
        # Фолбек — капіталізація key без категорійних префіксів
        base = [t for t in base_tokens if t not in CATEGORY_PREFIXES]
        name = cap(' '.join(base)) if base else cap(key.replace('-', ' '))

    return name + join_styles(styles + extra_style_flags)


def main():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    out = {}
    for k in data.keys():
        out[k] = translate_key(k)
    SRC.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding='utf-8')


if __name__ == '__main__':
    main()
