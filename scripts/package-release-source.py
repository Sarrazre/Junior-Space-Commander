"""Bundle release source without large media (restored by fetch-release-assets.mjs)."""
from pathlib import Path
import zipfile
readme = '''# Junior Space Commander release source

Team-authored code and documentation: MIT. Other components and agency materials retain their terms.

Large media and voice files are available from the public release. With Node 20+:

1. node scripts/fetch-release-assets.mjs
2. npm ci
3. npm run dev (or npm test && npm run build)

Play: https://junior-space-commander.sentientstudios.chatgpt.site/
Upstream: https://github.com/Sarrazre/Junior-Space-Commander/
'''
with zipfile.ZipFile('public/source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in ['index.html','package.json','package-lock.json','vite.config.js','README.md','LICENSE','.gitignore','public/SI-USE.json','public/THIRD-PARTY.txt','public/source-assets.json']:
        archive.write(name)
    for folder in ['src','scripts','tests','production/submission','public/icons']:
        for file in Path(folder).rglob('*'):
            if file.is_file() and file.suffix != '.pyc' and '__pycache__' not in file.parts:
                archive.write(file)
    archive.write('public/favicon.ico')
    archive.write('public/site.webmanifest')
    archive.writestr('RELEASE-SOURCE.md', readme)
