"""Export the project's NASA provenance, downloaded catalogs and source links.

Read-only for game/assets and sibling checkouts. Writes the requested TXT at
the repository root; does not fetch assets or read environment/credential files.
"""
from pathlib import Path
from collections import defaultdict, Counter
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode, unquote
import hashlib, html, json, re, subprocess

ROOT=Path(__file__).resolve().parents[1]
PULL=ROOT/'pull'
OUT=ROOT/'NASA-RESOURCES-USED.txt'
DATE='15 November 2026 (Asia/Singapore)'
REPOS=[ROOT]+[ROOT.parent/n for n in ['Zhetalis-Nasa-anim','Zhetalis-Nasa-coop','Zhetalis-Nasa-dust','Zhetalis-Nasa-Unity'] if (ROOT.parent/n).is_dir()]
URL_RE=re.compile(r'''https?://[^\s<>"'`\\]+''',re.I)
links={}
skipped=[]

def clean_url(value):
    # Decode explicit HTML entities only. HTML's permissive unescape would
    # corrupt a real query such as &timestamp into the entity &times + "tamp".
    value=re.sub(r'&(?:amp|quot|apos|lt|gt|#\d+|#x[0-9a-fA-F]+);',lambda m:html.unescape(m.group()),value).strip().rstrip('.,;')
    while value and ((value.endswith(')') and value.count(')')>value.count('(')) or (value.endswith(']') and value.count(']')>value.count('['))):
        value=value[:-1]
    try:
        u=urlsplit(value)
        if not u.hostname:return None
        # Never export credentials, private API keys or signed authorization.
        if any(re.search(r'key|token|signature|credential|password|secret|authorization',k,re.I) for k,_ in parse_qsl(u.query,keep_blank_values=True)):
            q=[(k,'REDACTED' if re.search(r'key|token|signature|credential|password|secret|authorization',k,re.I) else v) for k,v in parse_qsl(u.query,keep_blank_values=True)]
            value=urlunsplit((u.scheme,u.hostname+(':'+str(u.port) if u.port else ''),u.path,urlencode(q),u.fragment))
        return value
    except ValueError:return None

def category(url):
    u=urlsplit(url);host=(u.hostname or '').lower();path=u.path.lower()
    if host in ('github.com','raw.githubusercontent.com','api.github.com') and ('/nasa/' in path or path.startswith('/repos/nasa/')):
        return 'NASA 3D/source repositories'
    if host=='ares-a3d.s3.us-gov-east-1.amazonaws.com':return 'NASA ARES sample source files'
    if host=='pds-geosciences.wustl.edu' or host.endswith('.usgs.gov') and ('pds' in host or '/pds/' in path):return 'NASA PDS / partner-hosted planetary data'
    if host=='nasa.gov' or host.endswith('.nasa.gov'):
        if 'osdr' in host:return 'NASA OSDR and RadLab'
        if 'ccmc' in host:return 'NASA DONKI / CCMC'
        if host.startswith(('images','images-api','images-assets','epic','mars')) and ('image' in url.lower() or 'epic' in host):return 'NASA imagery and image APIs'
        if host.startswith(('pgda','svs','trek','pds')):return 'NASA terrain, maps and visualizations'
        return 'NASA mission, science and model pages'
    if host.endswith('asc-csa.gc.ca'):return 'RELATED: Canadian Space Agency (not NASA)'
    if host.endswith('noaa.gov') or host in ('spaceweather.gov','www.spaceweather.gov'):return 'RELATED: NOAA space weather (not NASA)'
    return None

def add(url,evidence,title=None):
    url=clean_url(url)
    if not url:return
    cat=category(url)
    if not cat:return
    row=links.setdefault(url,{'category':cat,'evidence':set(),'titles':set()})
    row['evidence'].add(evidence)
    if title:row['titles'].add(re.sub(r'\s+',' ',str(title))[:220])

def walk(value,evidence,title=None):
    if isinstance(value,dict):
        title=next((value[k] for k in ['title','name','product','id'] if isinstance(value.get(k),str)),title)
        for item in value.values():walk(item,evidence,title)
    elif isinstance(value,list):
        if value and isinstance(value[0],(int,float)):return
        for item in value:walk(item,evidence,title)
    elif isinstance(value,str):
        for url in URL_RE.findall(value):add(url,evidence,title)

def read_json(path):return json.loads(path.read_text(encoding='utf-8-sig'))

# Exclude scraped website navigation, complete unselected study indices and build caches.
# Downloaded selections and their provenance remain included.
args=['rg','--files','--hidden','--no-ignore']
for ext in ['md','txt','json','jsonl','js','mjs','ts','tsx','html','py','ps1','csv','cs']:
    args+=['-g','*.'+ext]
for pattern in ['**/.git/**','**/node_modules/**','**/Library/**','**/Temp/**','**/Logs/**','**/Builds/**','**/obj/**','**/.claude/**','**/.codex/**','**/.agents/**','**/.playwright-mcp/**','**/.env*','**/pull/references/**','**/nasa-tree.json','**/osdr-study-index.json','**/download-progress.jsonl','**/NASA-RESOURCES-USED.txt','**/export-nasa-resource-list.py']:
    args+=['-g','!'+pattern]
result=subprocess.run(args+[str(p) for p in REPOS],capture_output=True,text=True,encoding='utf-8',errors='replace')
if result.returncode not in (0,1):raise RuntimeError(result.stderr)
scanned=0;content_cache={}
for name in result.stdout.splitlines():
    path=Path(name)
    if path.name=='index.html' and 'pull' in path.parts:continue
    if 'pull' in path.parts and path.suffix=='.html':continue
    try:
        if path.stat().st_size>5_000_000:
            skipped.append(str(path));continue
        raw=path.read_bytes()
    except OSError:
        skipped.append(str(path));continue
    text=raw.decode('utf-8-sig',errors='replace')
    if not any(word in text.lower() for word in ['nasa.','/nasa/','noaa.gov','asc-csa.gc.ca','pds-geosciences','ares-a3d']):continue
    repo=next(p for p in REPOS if path.is_relative_to(p))
    evidence=repo.name+'/'+path.relative_to(repo).as_posix()
    digest=hashlib.sha256(raw).hexdigest()
    if digest in content_cache:
        for url in content_cache[digest]:links[url]['evidence'].add(evidence)
        continue
    before=set(links)
    if path.suffix=='.json':
        try:walk(json.loads(text),evidence)
        except json.JSONDecodeError:pass
    for url in URL_RE.findall(text):add(url,evidence)
    # Include already-seen URLs too when identical files occur in sibling builds.
    content_cache[digest]=[url for url,row in links.items() if evidence in row['evidence']]
    scanned+=1

models=read_json(PULL/'catalog/models.json')
archive=read_json(PULL/'catalog/nasa-downloads.json')
research=read_json(PULL/'catalog/research-downloads.json')
support=read_json(PULL/'catalog/osdr-file-downloads.json')
summary=read_json(PULL/'catalog/summary.json')

HUBS=[
('NASA Open APIs','https://api.nasa.gov/','API directory originally supplied by the user.'),
('NASA DONKI','https://ccmc.gsfc.nasa.gov/tools/DONKI/','Historical space-weather events and research references.'),
('DONKI API documentation','https://ccmc.gsfc.nasa.gov/DONKI/api/','Exact event queries are listed in the research downloads.'),
('NASA Open Science Data Repository','https://osdr.nasa.gov/bio/repo/','Selected crop, microbial and spacecraft-bioburden studies.'),
('OSDR API reference','https://www.nasa.gov/osdr-api/','Study metadata and file catalogues.'),
('NASA RadLab API guide','https://visualization.osdr.nasa.gov/radlab/gui/data-api/','Radiation measurements with instrument and location context.'),
('RadLab data endpoint','https://visualization.osdr.nasa.gov/radlab/api/','Exact ISS, Mars and lunar-orbit snapshot queries are listed below.'),
('Mars Trek','https://trek.nasa.gov/mars/','Map context; archived Viking colour tiles.'),
('Mars Trek API documentation','https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars','WMTS layer and map access reference.'),
('NASA 3D Resources','https://science.nasa.gov/3d-resources/','Official model landing pages.'),
('NASA 3D source repository','https://github.com/nasa/NASA-3D-Resources','Pinned archive of models, printable files, textures and previews.'),
('NASA Image and Video Library','https://images.nasa.gov/','Mission, launch, rover, plant and habitat imagery.'),
('NASA Image Library API','https://images-api.nasa.gov/','Search metadata and downloadable image asset catalogues.'),
('NASA Eyes on the Solar System','https://eyes.nasa.gov/apps/solar-system/#/sc_artemis_2','Orion / Artemis II model source.'),
('NASA PGDA LOLA south-pole terrain','https://pgda.gsfc.nasa.gov/products/81','Source of the regional Moon elevation grid.'),
('NASA SVS topographic Moon','https://svs.gsfc.nasa.gov/14959/','LRO topographic Moon model used in flybys.'),
('NASA ARES Apollo sample 10017,15','https://ares.jsc.nasa.gov/astromaterials3d/sample-details.htm?sample=10017-15','Apollo 11 basalt educational replica.'),
]
for title,url,note in HUBS:add(url,'Project primary source index',title)

lines=[]
def emit(*items):lines.extend(str(s) for s in items)
def section(title):emit('', '='*78,title,'='*78,'')
def exists(record):return (PULL/record['local']).is_file() if record.get('local') else False
def download_entry(i,row,title=None):
    emit(f'{i:04d}. {title or row.get("name") or row.get("title") or row.get("file") or row.get("source_path") or row.get("local")}',
         '    URL: '+(clean_url(row.get('url','')) or '(record has no source URL)'),
         '    Local: pull/'+row.get('local','(not recorded)'),
         '    Status: '+row.get('status','recorded')+'; local file '+('present' if exists(row) else 'not found'))
    if row.get('notes'):emit('    Notes: '+re.sub(r'\s+',' ',row['notes']))

emit('ZHETALIS NASA GAME - RESOURCE LINKS AND COMPLETE LOCAL SOURCE LIST',
     'Compiled: '+DATE,'Output: '+str(OUT),'',
     'Scope: project source, credits, provenance records and downloaded selections in',
     'the main checkout and the animation, co-op, dust and Unity sibling checkouts.',
     'The separate archive lists everything pulled, not only what gameplay loads.',
     'A retained model or reference does not by itself prove an active gameplay use.',
     'No new models were downloaded to produce this inventory. API keys are excluded.',
     'Saved website navigation and the complete unselected OSDR study index are not',
     'counted as resources used. The selected study records and supporting files are.',
     'Download counts/hashes come from existing manifests; file presence was checked',
     'during this export. The large asset archive was not rehashed or render-tested.',
     '',
     'CONTENTS',
     '1. Main NASA services and source hubs',
     '2. Game model, terrain and source-provenance highlights',
     '3. All 257 archived GLB model names and download links',
     '4. Scientific datasets, imagery, map tiles and reference downloads',
     '5. All selected OSDR supporting-file downloads',
     '6. Complete NASA asset archive: every file and original URL',
     '7. Other NASA links recorded in project source and data',
     '8. Related non-NASA sources (CSA and NOAA)',
     '9. Unique URL index and evidence paths',
     '10. Inventory notes, link checks and source manifests')
section('1. MAIN NASA SERVICES AND SOURCE HUBS')
for i,(title,url,note) in enumerate(HUBS,1):emit(f'{i:02d}. {title}',url,note,'')
section('2. GAME MODEL, TERRAIN AND SOURCE-PROVENANCE HIGHLIGHTS')
highlights=[
('Z-2 spacesuit / articulated gameplay derivative','https://science.nasa.gov/3d-resources/z2-spacesuit/','game/assets/models/nasa-spacesuits/z2-gameplay.glb; game/src/z2-suit.js; source-assets/blender/z2-gameplay/README.md'),
('NASA astronaut reference / earlier game suit','https://science.nasa.gov/3d-resources/astronaut/','game/assets/astronaut.glb; game/assets/nasa-astronaut.glb; earlier suit source retained'),
('JSC Mission Control Room / console source','https://science.nasa.gov/3d-resources/jsc-mission-control-room/','game/assets/training/jsc-mission-control-source.json; retained training/briefing console source'),
('Habitat Demonstration Unit / earlier shelter source','https://science.nasa.gov/3d-resources/habitat-demonstration-unit/','game/assets/training/shelter-source.json; retained model, not proof that Earth training remains enabled'),
('Spirit landing-site reference','https://science.nasa.gov/3d-resources/mars-spirit-landing-site/','game/src/nasamodels.js; earlier Gusev height-source reference'),
('Mars globe / arrival map reference','https://science.nasa.gov/3d-resources/mars/','game/src/nasamodels.js; game/assets/mars-map.jpg'),
('Mars MOLA elevation product','https://pds-geosciences.wustl.edu/missions/mgs/megdr.html','game/assets/terrain/gusev-mola-128.json; NASA PDS data hosted by Washington University'),
('Moon regional LOLA elevation data','https://pgda.gsfc.nasa.gov/products/81','game/moon/data/regional-terrain.json; 5 m regional grid source'),
('Full topographic Moon and phone derivative','https://svs.gsfc.nasa.gov/14959/','game/assets/nasa/moon-lro.glb; game/assets/nasa/moon-lro-lite.glb'),
('NASA Eyes Orion / Artemis II','https://eyes.nasa.gov/apps/solar-system/#/sc_artemis_2','game/assets/nasa/orion/source-manifest.json; orion-eyes.glb'),
('Printable Orion capsule source','https://science.nasa.gov/3d-resources/orion-capsule/','game/assets/nasa/orion-capsule.stl; earlier mesh retained'),
('Apollo Lunar Module','https://science.nasa.gov/3d-resources/apollo-lunar-module/','game/assets/nasa/apollo-lunar-module.glb; Moon/history exhibit'),
('Lunar Reconnaissance Orbiter','https://science.nasa.gov/3d-resources/lunar-reconnaissance-orbiter-a/','game/assets/nasa/lro-orbiter.glb; lunar survey exhibit'),
('Apollo 11 sample 10017,15','https://ares.jsc.nasa.gov/astromaterials3d/sample-details.htm?sample=10017-15','game/assets/nasa/apollo-10017-15.glb; game/moon/data/apollo-10017-15.json'),
]
for title,url,usage in highlights:
    add(url,'Project game provenance highlights',title);emit(title,url,'Local evidence/use: '+usage,'')
emit('Additional game model families recorded in game/assets/README.md and nasamodels.js:',
     '- SLS Block 1, Mobile Launcher and Vehicle Assembly Building.',
     '- Mars Reconnaissance Orbiter, Ingenuity, Perseverance and MER Opportunity.',
     '- Pistol Grip Tool, Wrench, Crew Lock Bag, Orbital Replacement Unit,',
     '  Infrared Camera and Mark III spacesuit.',
     'Exact original file links and every other archived model are in sections 3 and 6.',
     '',
     'Origin distinctions:',
     '- Mars One habitat base: third-party Sketchfab model by admone, not a NASA model.',
     '  https://sketchfab.com/3d-models/mars-one-mission-base-83ced347037f47aba8473147d65df074',
     '- Saturn V history GLB: Stanley Creative / user-supplied, not an official NASA model.',
     '  https://sketchfab.com/3d-models/saturn-v-nasa-7a2c9709ff8144c8b3b18ec84b5e112e',
     '- Cabin characters and their animations: Mixamo; Zhetalis space-pack models:',
     '  original team work. Procedural Starship/HLS geometry is game-authored.')
section(f'3. ALL {len(models)} ARCHIVED GLB MODELS - NAMES AND ORIGINAL DOWNLOAD LINKS')
emit('Catalog: pull/catalog/models.json','Pinned NASA source commit: '+archive['commit'],'')
for i,row in enumerate(sorted(models,key=lambda r:r['name'].casefold()),1):
    download_entry(i,row,row['name'])
    emit('    Geometry: '+str(row.get('triangles','?'))+' triangles; animation clips: '+(', '.join(row.get('animations',[])) or 'none recorded'))
    emit('    Validation: '+row.get('validation','not recorded'),'')
section('4. SCIENTIFIC DATASETS, IMAGERY, MAP TILES AND REFERENCE DOWNLOADS')
emit('The following are selected archived downloads, not the full contents of NASA services.',
     'Historical dates, instruments and study accessions must be kept with the data.','',
     'Recorded collection totals:',
     'DONKI event counts: '+json.dumps(summary['donki_events'],sort_keys=True),
     'RadLab rows: '+json.dumps(summary['radlab_rows'],sort_keys=True),
     'Research download types: '+json.dumps(summary['research_kinds'],sort_keys=True),'')
grouped=defaultdict(list)
for row in research:
    if category(row['url']) and not category(row['url']).startswith('RELATED:'):grouped[row['kind']].append(row)
for kind,rows in sorted(grouped.items()):
    emit('--- '+kind+' ('+str(len(rows))+') ---','')
    for i,row in enumerate(rows,1):
        title=row.get('title') or row.get('name') or Path(row['local']).name
        download_entry(i,row,title);emit('')
section(f'5. SELECTED OSDR SUPPORTING FILES ({len(support)})')
for i,row in enumerate(support,1):
    download_entry(i,row,row['accession']+' / '+row['file'])
    emit('    Category: '+row.get('category','not recorded'),'')
section(f'6. COMPLETE PINNED NASA ASSET ARCHIVE ({len(archive["files"])} FILE RECORDS)')
emit('Includes GLB, STL, Blender sources, source packages, textures, previews and PDFs.',
     'These are local source-library files; they are not all promoted into gameplay.',
     'Pinned commit: '+archive['commit'],
     'Recorded bytes: '+str(sum(row.get('bytes',0) for row in archive['files'])),'')
for i,row in enumerate(sorted(archive['files'],key=lambda r:r['source_path'].casefold()),1):
    download_entry(i,row,row['source_path']);emit('')
section('7. OTHER NASA LINKS RECORDED IN GAME SOURCE, FACTS, DATA AND CREDITS')
for cat in sorted({r['category'] for r in links.values() if not r['category'].startswith('RELATED:')}):
    rows=[(u,r) for u,r in links.items() if r['category']==cat and any('/game/' in p or '/scripts/' in p or p.endswith('.md') for p in r['evidence'])]
    if not rows:continue
    emit('--- '+cat+' ---','')
    for url,row in sorted(rows):
        # Asset file details already appear in the full model and download lists.
        if 'raw.githubusercontent.com/nasa/NASA-3D-Resources/' in url:continue
        emit(url)
        if row['titles']:emit('  Label: '+sorted(row['titles'])[0])
        emit('  Evidence: '+'; '.join(sorted(row['evidence'])[:4]),'')
section('8. RELATED NON-NASA SOURCES: CANADIAN SPACE AGENCY AND NOAA')
emit('Included because the project used/researched them alongside NASA sources.',
     'They are separate agencies.','')
related=[r for r in research if (category(r['url']) or '').startswith('RELATED:')]
for i,row in enumerate(related,1):
    download_entry(i,row,row.get('title') or Path(row['local']).name);emit('')
for cat in sorted({r['category'] for r in links.values() if r['category'].startswith('RELATED:')}):
    emit('--- '+cat+' ---')
    for url,row in sorted(links.items()):
        if row['category']==cat:emit(url,'  Evidence: '+'; '.join(sorted(row['evidence'])[:2]))
section('9. UNIQUE URL INDEX WITH PROJECT EVIDENCE')
emit('This appendix deduplicates URLs across builds. Dates/query parameters are kept.',
     'Template URLs containing ${...} or {date} are source-code patterns, not ready',
     'download links. Historical/legacy endpoints remain listed for traceability.','')
for cat in sorted({r['category'] for r in links.values()}):
    emit('--- '+cat+' ---','')
    for i,(url,row) in enumerate(sorted((u,r) for u,r in links.items() if r['category']==cat),1):
        emit(f'{i:04d}. {url}')
        evidence=sorted(row['evidence'])
        emit('    Recorded in: '+'; '.join(evidence[:5])+(' ; plus '+str(len(evidence)-5)+' other locations' if len(evidence)>5 else ''))
    emit('')
section('10. INVENTORY NOTES, LINK CHECKS AND MANIFESTS')
emit('Main portal checks performed on '+DATE+':',
     '- api.nasa.gov: reached; signup and portions of the portal use JavaScript.',
     '- CCMC DONKI: official tool page reached. Its current notice says legacy',
     '  kauai.ccmc.gsfc.nasa.gov links migrate to ccmc.gsfc.nasa.gov; old recorded',
     '  links have not been silently rewritten.',
     '- OSDR repository: reached as a JavaScript application.',
     '- RadLab API guide, Mars Trek, NASA 3D Resources, NASA 3D GitHub repository,',
     '  NASA Image Library and PGDA product 81: reached.',
     '- The full set of individual asset/data URLs was inventoried from existing',
     '  records, not individually re-downloaded or checked for current HTTP success.',
     '- The legacy mars.nasa.gov raw-image RSS query produced browser CORS failures',
     '  in the local co-op test; its presence here is historical evidence, not a',
     '  statement that it currently works in every browser.',
     '',
     'Primary local evidence:',
     'pull/catalog/models.json',
     'pull/catalog/nasa-downloads.json',
     'pull/catalog/research-downloads.json',
     'pull/catalog/osdr-file-downloads.json',
     'pull/catalog/summary.json',
     'pull/catalog/RESEARCH.md',
     'pull/catalog/MODELS.md',
     'pull/SOURCES-AND-USAGE.md',
     'game/assets/README.md',
     'game/assets/nasa/MODELS.md',
     'game/assets/nasa/orion/source-manifest.json',
     'game/assets/training/SOURCES.md',
     'game/data/research-resources.json',
     'game/data/information.json; game/data/mars-facts.json; game/data/moon-facts.json',
     'game/assets/terrain/gusev-mola-128.json',
     'game/moon/data/regional-terrain.json; game/moon/data/apollo-10017-15.json',
     '',
     'Source credit / usage guidance recorded by the project:',
     'https://www.nasa.gov/nasa-brand-center/images-and-media/',
     'https://github.com/nasa/NASA-3D-Resources',
     '',
     'Export checks:',
     'Unique categorized URL strings: '+str(len(links)),
     'Unique source files scanned: '+str(scanned),
     'Archive file records present locally: '+str(sum(exists(r) for r in archive['files']))+'/'+str(len(archive['files'])),
     'GLB catalog records present locally: '+str(sum(exists(r) for r in models))+'/'+str(len(models)),
     'Research download records present locally: '+str(sum(exists(r) for r in research))+'/'+str(len(research)),
     'OSDR supporting records present locally: '+str(sum(exists(r) for r in support))+'/'+str(len(support)),
     'Excluded oversized/unreadable files: '+str(len(skipped)),
     '', 'Rebuild this text inventory with: python scripts/export-nasa-resource-list.py')
if skipped:emit('Excluded files:','\n'.join(skipped))
for url in links:
    for key,value in parse_qsl(urlsplit(url).query,keep_blank_values=True):
        if re.search(r'key|token|signature|credential|password|secret|authorization',key,re.I):
            assert value=='REDACTED','Sensitive URL field was not redacted'
assert all(clean_url(r['url']) in links for r in archive['files'])
assert all(clean_url(r['url']) in links for r in research)
assert all(clean_url(r['url']) in links for r in support)
OUT.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({'file':str(OUT),'bytes':OUT.stat().st_size,'lines':len(lines),'unique_urls':len(links),
                  'models':len(models),'archive_files':len(archive['files']),'research_records':len(research),'supporting_files':len(support),
                  'present':{'models':sum(exists(r) for r in models),'archive_files':sum(exists(r) for r in archive['files'])},
                  'source_files':scanned,'excluded_files':len(skipped)},indent=2))
