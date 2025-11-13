#!/usr/bin/env python3
import json
import re
from pathlib import Path

PATH = Path('translations/missing-synonyms/part-0001.json')


def is_generic(lst, key):
    base = {"логотип", "бренд", key}
    return set(lst).issubset(base)


def ensure_unique_limit(items, key, limit = 20):
    seen = set()
    out = []
    for s in items + [key]:
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
        if len(out) >= limit:
            break
    return out


def domain_variant(k):
    m = re.search(r"(.*)dot(\w+)$", k)
    if not m:
        return None
    tld = m.group(2).lower()
    allowed = {"com","org","net","io","me","ai","app","dev","gg","fm","tv","ch","co","xyz","ru","ua","de","fr","nl","pl","es","it","br","ca","us","uk"}
    if tld not in allowed:
        return None
    return f"{m.group(1)}.{tld}"


def seconds_variants(k):
    m = re.fullmatch(r"(\d+)sec", k)
    if not m:
        return []
    n = m.group(1)
    return [f"{n} сек", f"{n} секунд", f"{n} sec"]


def ratio_variants(k):
    m = re.fullmatch(r"(\d+)x(\d+)", k)
    if not m:
        return []
    a, b = m.group(1), m.group(2)
    return [f"{a} x {b}", f"{a}:{b}", f"{a} на {b}"]


AIRLINES = {"airasia", "aircanada", "airchina", "airfrance", "airindia", "airserbia", "airtransat", "aerlingus", "aeroflot", "aeromexico"}

APACHE = {
    "apacheant": ["збірка", "build", "java", "ant", "інструмент"],
    "apacheavro": ["серіалізація", "avro", "формат даних", "schema"],
    "apachecassandra": ["nosql", "база даних", "distributed", "cassandra", "wide column"],
    "apachecloudstack": ["iaas", "cloud", "віртуалізація", "open source"],
    "apachecordova": ["мобільний", "hybrid", "cordova", "html5", "native"],
    "apachecouchdb": ["nosql", "document db", "couchdb", "replication"],
    "apachedolphinscheduler": ["оркестрація", "workflow", "scheduler", "etl"],
    "apachedoris": ["olap", "аналітика", "doris", "sql"],
    "apachedruid": ["olap", "реальний час", "аналітика", "druid"],
    "apacheecharts": ["графіки", "charts", "візуалізація", "echarts"],
    "apacheflink": ["stream", "обробка потоків", "flink", "реальний час"],
    "apachefreemarker": ["шаблони", "template", "java", "freemarker"],
    "apachegroovy": ["groovy", "мова", "java", "скриптинг"],
    "apacheguacamole": ["віддалений робочий стіл", "remote desktop", "html5", "rdp", "vnc"],
    "apachehadoop": ["big data", "mapreduce", "кластер", "hdfs", "yarn"],
    "apachehbase": ["nosql", "hbase", "wide column", "hadoop"],
    "apachehive": ["sql", "data warehouse", "hive", "hadoop"],
    "apachejmeter": ["навантаження", "тестування", "load testing", "jmeter"],
    "apachekylin": ["olap", "cube", "аналітика", "kylin"],
    "apachelucene": ["пошук", "index", "lucene", "full-text"],
    "apachemaven": ["maven", "build", "java", "збірка", "dependency"],
    "apachenetbeanside": ["ide", "java", "netbeans", "редактор"],
    "apachenifi": ["dataflow", "etl", "потоки даних", "nifi"],
    "apacheopenoffice": ["офіс", "офісний пакет", "writer", "calc", "impress"],
}

SPECIFIC = {
    "1and1": ["1&1", "1 and 1"],
    "1dot1dot1dot1": ["1.1.1.1", "dns", "публічний dns", "cloudflare"],
    "25x": ["25 x", "25 разів", "25 times"],
    "2x3": ["2 x 3", "2:3", "2 на 3"],
    "30sec": ["30 сек", "30 секунд", "30 sec"],
    "15sec": ["15 сек", "15 секунд", "15 sec"],
    "5sec": ["5 сек", "5 секунд", "5 sec"],
    "3m": ["3M"],
    "addydotio": ["addy.io"],
    "abusedotch": ["abuse.ch"],
    "accenture": ["консалтинг", "айті", "аутсорс", "Accenture"],
    "acer": ["ноутбуки", "комп'ютери", "монітори", "Acer"],
    "acura": ["авто", "машина", "японія", "Acura"],
    "adafruit": ["електроніка", "arduino", "сенсори", "DIY", "Adafruit"],
    "adidas": ["одяг", "спорт", "кросівки", "Adidas"],
    "aerlingus": ["авіакомпанія", "перельоти", "літак", "Aer Lingus"],
    "aeroflot": ["авіакомпанія", "перельоти", "літак", "Aeroflot"],
    "aeromexico": ["авіакомпанія", "перельоти", "літак", "AeroMéxico"],
    "airasia": ["авіакомпанія", "перельоти", "літак", "AirAsia"],
    "aircanada": ["авіакомпанія", "перельоти", "літак", "Air Canada"],
    "airchina": ["авіакомпанія", "перельоти", "літак", "Air China"],
    "airfrance": ["авіакомпанія", "перельоти", "літак", "Air France"],
    "airindia": ["авіакомпанія", "перельоти", "літак", "Air India"],
    "airserbia": ["авіакомпанія", "перельоти", "літак", "Air Serbia"],
    "airtransat": ["авіакомпанія", "перельоти", "літак", "Air Transat"],
    "alibabacloud": ["хмара", "cloud", "Alibaba Cloud", "сервіси"],
    "alibabadotcom": ["alibaba.com", "маркетплейс", "b2b", "постачальники"],
    "alienware": ["ігровий пк", "ноутбук", "комп'ютер", "Alienware"],
    "aliexpress": ["магазин", "шопінг", "китай", "маркетплейс", "AliExpress"],
    "allegro": ["маркетплейс", "покупки", "Польща", "Allegro"],
    "alamy": ["сток фото", "фотографії", "зображення", "Alamy"],
    "albertheijn": ["супермаркет", "магазин", "Нідерланди", "AH"],
    "aldinord": ["супермаркет", "магазин", "продукти", "Aldi Nord"],
    "aldisud": ["супермаркет", "магазин", "продукти", "Aldi Süd"],
    "alfred": ["лаунчер", "пошук", "macOS", "Alfred"],
    "aib": ["банк", "фінанси", "картка", "Allied Irish Banks"],
    "aidungeon": ["гра", "текстова гра", "ai", "AI Dungeon"],
    "aiohttp": ["python", "http", "async", "aiohttp"],
    "aiqfome": ["доставка їжі", "замовлення", "кур'єр", "food delivery"],
    "airbyte": ["etl", "інтеграції", "дані", "конектори", "Airbyte"],
    "aircall": ["дзвінки", "voip", "колцентр", "телефонія", "Aircall"],
    "akaunting": ["бухгалтерія", "рахунки", "інвойси", "фінанси", "Akaunting"],
    "akiflow": ["таск-менеджер", "планування", "список справ", "Akiflow"],
    "alby": ["гаманець", "bitcoin", "lightning", "крипто", "Alby"],
    "alchemy": ["web3", "api", "крипто", "Alchemy"],
    "alist": ["файли", "хмарне сховище", "директрії", "листинг", "alist"],
    "animedotjs": ["anime.js", "анімація", "javascript", "анімувати"],
    "ankermake": ["3d принтер", "друк", "ankermake"],
    "anycubic": ["3d принтер", "друк", "Anycubic"],
    "anydesk": ["віддалений доступ", "remote desktop", "підключення", "AnyDesk"],
    "anytype": ["нотатки", "простір", "knowledge", "workspace", "Anytype"],
    "antena3": ["тв", "канал", "іспанія", "Antena 3"],
    "antennapod": ["подкасти", "rss", "аудіо", "Antennapod"],
    "antv": ["візуалізація", "charts", "графіки", "AntV"],
    "aol": ["America Online", "портал", "пошта", "чат", "AOL"],
}


def main():
    data = json.loads(PATH.read_text())
    changed = 0
    for k, v in list(data.items()):
        if not isinstance(v, list) or not v:
            continue
        # Upgrade seconds/ratio/domain even if not generic
        upgrades: list[str] = []
        if k in SPECIFIC:
            upgrades += SPECIFIC[k]
        dom = domain_variant(k)
        if dom:
            upgrades.append(dom)
        upgrades += seconds_variants(k)
        upgrades += ratio_variants(k)
        if k in AIRLINES:
            upgrades += ["авіакомпанія", "перельоти", "літак"]
        if k in APACHE:
            upgrades += APACHE[k]

        # If it's obviously generic, replace; otherwise extend (but avoid duplicates)
        if is_generic(v, k) and upgrades:
            new_list = upgrades
        elif upgrades:
            new_list = v + [s for s in upgrades if s not in v]
        else:
            new_list = v

        new_list = ensure_unique_limit(new_list, k, 20)
        if new_list != v:
            data[k] = new_list
            changed += 1

    PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"changed: {changed}")


if __name__ == "__main__":
    main()
