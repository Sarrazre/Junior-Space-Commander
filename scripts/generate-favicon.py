"""Draw the small Mars identity in PNG/ICO fallback formats (no external assets)."""
from PIL import Image, ImageDraw
from pathlib import Path
root = Path('public'); scale = 4
im = Image.new('RGBA', (256,256)); d = ImageDraw.Draw(im)
def box(coords): return tuple(int(x*scale) for x in coords)
d.rounded_rectangle(box((0,0,63,63)), radius=16*scale, fill='#102439')
d.ellipse(box((9,10,55,56)), fill='#e36c42')
d.polygon([(x*scale,y*scale) for x,y in [(12,35),(22,31),(29,26),(36,28),(43,36),(53,36),(48,48),(38,54),(28,55),(18,48)]],fill='#b64631')
d.ellipse(box((18,15,36,22)),fill='#ffab70')
d.ellipse(box((18,35,26,43)),fill='#933d31')
d.ellipse(box((37,20,47,26)),fill='#bd4b32')
d.polygon([(int(x*scale),int(y*scale)) for x,y in [(51,5),(52.5,9.5),(57,11),(52.5,12.5),(51,17),(49.5,12.5),(45,11),(49.5,9.5)]],fill='#fff0bf')
for size in (32,180,192,512):
 im.resize((size,size),Image.Resampling.LANCZOS).save(root/'icons'/f'mars-{size}.png')
im.save(root/'favicon.ico',format='ICO',sizes=[(16,16),(32,32),(48,48),(64,64)])
