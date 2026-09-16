import json, pathlib, requests, concurrent.futures, io, re
from PIL import Image
from bs4 import BeautifulSoup
ROOT=pathlib.Path(__file__).resolve().parents[1]
assets=ROOT/'public/assets'; assets.mkdir(parents=True,exist_ok=True)
src=json.loads((ROOT/'research/products-source.json').read_text(encoding='utf-8'))
categories={}
for handle,cat in [('perfumes','perfume'),('oud','oud'),('dehnal-oud-hindi-khaas-al-khaas','oil'),('oud-muttar','muttar'),('all-over-spray','spray')]:
    data=requests.get(f'https://raeesaloud.com/collections/{handle}/products.json?limit=250',timeout=30).json()
    for p in data['products']: categories[p['handle']]=cat
notes={
'azule':(['Citrus','Neroli','Black tea'],['حمضيات','نيرولي','شاي أسود'],'fresh','Citrus brightness, with neroli and black tea.','إشراقة الحمضيات مع النيرولي والشاي الأسود.'),
'spotlight':(['Orange','Fruity notes','Amber'],['برتقال','نفحات فاكهية','عنبر'],'sweet','A fruity opening with a warm amber finish.','افتتاحية فاكهية وخاتمة دافئة من العنبر.'),
'rutbah':(['Oud','Coconut','White flowers'],['عود','جوز الهند','زهور بيضاء'],'woody','Oud and coconut meet soft floral notes.','يلتقي العود وجوز الهند بنفحات زهرية ناعمة.'),
'raeesi':(['Oud','Rose','Ambergris'],['عود','ورد','عنبر رمادي'],'floral','Oud, rose and ambergris in a layered composition.','تكوين متعدد الطبقات من العود والورد والعنبر الرمادي.'),
'oud-safrano':(['Oud','Saffron','Amber'],['عود','زعفران','عنبر'],'spiced','Oud warmed by saffron, nutmeg and amber.','عود تدفئه نفحات الزعفران وجوزة الطيب والعنبر.'),
'leather-oud':(['Oud','Leather','Patchouli'],['عود','جلد','باتشولي'],'woody','Oud with leather, patchouli and amber notes.','عود مع نفحات الجلد والباتشولي والعنبر.'),
'izzah':(['Cardamom','Cinnamon','Sandalwood'],['هيل','قرفة','صندل'],'spiced','Spiced woods, cardamom and sandalwood.','أخشاب متبلة مع الهيل وخشب الصندل.'),
'de-ja-vu':(['Rose','Pink pepper','Oud'],['ورد','فلفل وردي','عود'],'floral','Rose, pink pepper and oud come together.','تجتمع نفحات الورد والفلفل الوردي والعود.'),
'zura-yaumi':(['Sweet','Oudy'],['حلو','عودي'],'sweet','Sweet, oudy wood for a daily incense ritual.','خشب بنفحات حلوة وعودية لطقوس التبخير اليومية.'),
'seyufi-salla-naqwah':(['Saffron-like','Oudy'],['زعفراني','عودي'],'spiced','Oud wood with a saffron-like character.','خشب عود بطابع زعفراني.'),
'char-gaf':(['Sweet','Oudy'],['حلو','عودي'],'sweet','Sweet oud wood, offered in several weights.','خشب عود حلو الطابع، متوفر بأوزان مختلفة.'),
}
ar={'azule':'أزول','spotlight':'سبوتلايت','rutbah':'رتبة','raeesi':'رئيسي','oud-safrano':'عود سافرانو','leather-oud':'ليذر عود','izzah':'عزة','de-ja-vu':'ديجا فو','zura-yaumi':'زورا يومي','muri-double-super':'موري فاخر','seyufi-salla-naqwah':'سيوفي صلة نقوة','fannan':'فنان','fawah':'فواح','ruby':'روبي','sapphire':'سافاير','char-gaf':'شار جاف','mini-visa-muri':'ميني فيزا موري','visa-muri':'فيزا موري','baby-salla':'بيبي صلة','manipur-zura-triple-super':'زورا ملكي','king-muri-munasibat':'كينغ موري مناسبات','digga-muri-naqwah':'دقة موري','ball-muri-naqwah':'بول موري نقوة','dehnal-oud-seylani-qadim':'دهن عود سيلاني قديم','dehnal-oud-royal-trat':'دهن عود رويال ترات','dehnal-oud-royal-prachin':'دهن عود رويال براشين','dehnal-oud-hindi-seyufi':'دهن عود هندي سيوفي','dehnal-oud-hindi-qadim':'دهن عود هندي قديم','dehnal-oud-hindi-khaas-al-khaas':'دهن عود هندي خاص الخاص'}
def process(p):
    h=p['handle']; cat=categories.get(h,'perfume')
    fallback={ 'oud':('Oud wood. Choose the weight that suits your ritual.','خشب عود. اختر الوزن المناسب لطقوسك.'), 'oil':('Oud oil, offered in 3 ml, 6 ml and 12 ml sizes.','دهن عود متوفر بأحجام ٣ و٦ و١٢ مل.'), 'muttar':('Explore the Oud Muttar collection.','اكتشف مجموعة العود المعطر.'), 'spray':('Discover the All Over Spray collection.','اكتشف مجموعة بخاخات الجسم.') }
    en,arab=fallback.get(cat,('Explore this fragrance.','اكتشف هذا العطر.'))
    n,na,family,desc,da=notes.get(h,([],[],'oud' if cat in ['oud','oil'] else 'unclassified',en,arab))
    imgs=[]
    for i,im in enumerate(p['images'][:2]):
        raw=requests.get(im['src']+'&width=1000',timeout=40); raw.raise_for_status()
        pic=Image.open(io.BytesIO(raw.content)).convert('RGB'); pic.thumbnail((1000,1000))
        name=f'{h}-{i}.webp';pic.save(assets/name,'WEBP',quality=83)
        imgs.append('/assets/'+name)
    return {'id':h,'name':p['title'],'nameAr':ar.get(h,p['title']),'category':cat,'family':family,'notes':n,'notesAr':na,'description':desc,'descriptionAr':da,'images':imgs,'source':'https://raeesaloud.com/products/'+h,'variants':[{'id':str(v['id']),'label':v['title'] if v['title']!='Default Title' else 'Standard','price':round(float(v['price'])*100),'available':v['available']} for v in p['variants']]}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: data=list(pool.map(process,[p for p in src if p['handle']!='test']))
priority=['raeesi','oud-safrano','azule','rutbah','zura-yaumi','dehnal-oud-royal-trat','spotlight','de-ja-vu']
data.sort(key=lambda p:priority.index(p['id']) if p['id'] in priority else 99)
(ROOT/'server').mkdir(exist_ok=True)
(ROOT/'server/catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Prepared {len(data)} products with local optimized images; categories: {set(categories.values())}')
