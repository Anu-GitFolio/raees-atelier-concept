import json, re, time, concurrent.futures, pathlib, urllib.parse
import requests
from bs4 import BeautifulSoup
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'research'; OUT.mkdir(exist_ok=True)
(OUT/'raw').mkdir(exist_ok=True)
BASE='https://raeesaloud.com'
def get(url):
    r=requests.get(url,timeout=35); r.raise_for_status(); return r
maps=BeautifulSoup(get(BASE+'/sitemap.xml').text,'xml')
urls={BASE+'/'}
for loc in maps.find_all('loc'):
    if not urllib.parse.urlparse(loc.text).path.endswith('.xml'): continue
    doc=BeautifulSoup(get(loc.text).text,'xml')
    urls.update(e.loc.text for e in doc.find_all('url'))
home=BeautifulSoup(get(BASE).text,'html.parser')
for a in home.select('a[href]'):
    u=urllib.parse.urljoin(BASE,a['href']).split('?')[0].split('#')[0]
    if u.startswith(BASE) and any(x in u for x in ['/policies/','/pages/','/collections/','/products/','/blogs/']): urls.add(u)
urls.update(BASE+p for p in ['/search','/cart','/pages/wishlist','/account/login'])
def inspect(url):
    try:
        r=get(url); soup=BeautifulSoup(r.text,'html.parser')
        main=soup.select_one('main') or soup
        for el in main.select('script,style,noscript,svg,header,footer'): el.decompose()
        text='\n'.join(x.strip() for x in main.get_text('\n').splitlines() if x.strip())
        slug=urllib.parse.urlparse(url).path.strip('/').replace('/','_') or 'home'
        (OUT/'raw'/f'{slug}.txt').write_text(text,encoding='utf-8')
        return {'url':url,'status':r.status_code,'title':soup.title.text.strip() if soup.title else '', 'text':text[:14000], 'final_url':r.url}
    except Exception as e:return {'url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: pages=list(pool.map(inspect,sorted(urls)))
(OUT/'audit-pages.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2),encoding='utf-8')
products=get(BASE+'/products.json?limit=250').json()['products']
(OUT/'products-source.json').write_text(json.dumps(products,ensure_ascii=False,indent=2),encoding='utf-8')
images=[]
for img in home.select('img'):
    src=img.get('src','')
    if src:images.append({'src':urllib.parse.urljoin(BASE,src),'alt':img.get('alt',''),'width':img.get('width'),'height':img.get('height')})
(OUT/'home-images.json').write_text(json.dumps(images,ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# Public page inventory','', 'Reviewed: 2026-09-16. Automated HTML content inspection; visual and interactive template checks are tracked separately. No account login or orders submitted.','', '| URL | HTTP status | Title / limitation |','|---|---|---|']
for p in pages:lines.append(f"| {p['url']} | {p.get('status','Failed')} | {p.get('title',p.get('error','')).replace('|','/')} |")
(OUT/'PAGE-INVENTORY.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps({'pages':len(pages),'errors':[p for p in pages if 'error' in p],'products':len(products),'titles':[p['title'] for p in products]},ensure_ascii=False))
