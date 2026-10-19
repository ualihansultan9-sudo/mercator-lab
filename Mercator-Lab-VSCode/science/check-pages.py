"""Static page, asset and navigation checks; this is not a browser test."""
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / 'dist'

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.scripts = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            assert a['id'] not in self.ids, f"Duplicate id {a['id']}"
            self.ids.add(a['id'])
        if tag in ('a','link') and 'href' in a:
            self.links.append(a['href'])
        if tag == 'script' and 'src' in a:
            self.scripts.append(a['src'])
            self.links.append(a['src'])

pages = {}
for file in ROOT.glob('*.html'):
    p = Page()
    p.feed(file.read_text())
    pages[file.name] = p

for name,p in pages.items():
    for link in p.links:
        if re.match(r'^(https?:|mailto:|data:)',link):
            continue
        file,_,fragment=link.partition('#')
        if not file:
            assert fragment in p.ids,(name,link)
        elif not file.endswith('.zip'):
            assert (ROOT/file).is_file(),(name,link)
            if fragment:
                assert fragment in pages[file].ids,(name,link)
    if name!='guide.html':
        assert all(x in p.links for x in ['index.html','lab.html','experiments.html','surfaces.html','method.html']), name
        assert p.scripts[:3]==['math.js','content.js','app.js'],name
        assert 'lang' in p.ids,name

assert 'globe' in pages['lab.html'].ids
assert 'expLat' in pages['experiments.html'].ids
assert 'methodContent' in pages['method.html'].ids
assert 'surfaceCanvas' in pages['surfaces.html'].ids
for file in ROOT.iterdir():
    if file.suffix in ('.html','.js','.css'):
        source=file.read_text()
        for unwanted in ['id="defense"','defenseContent','Бастапқы ғылыми жұмысқа рецензия','Қосымша мүмкіндіктерді бағалау','Уалихан Сұлтан','Ділдәбек Ділнұр']:
            assert unwanted not in source,(file.name,unwanted)
print(f'Page structure: {len(pages)} pages; navigation, assets, unique IDs and removals PASS. No browser execution performed.')
