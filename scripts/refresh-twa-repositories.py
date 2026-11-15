"""Fetch the supplied comparison repositories; fast-forward clean checkouts only."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess,json

BASE=Path('C:/Compeition_TWA').resolve()
OUT=Path('C:/Users/Lenovo/.codex/visualizations/2026/11/13/01a1d56b-ef59-7f00-bbce-93101280eea1/twa-update-report.json')
def git(root,*args,required=True):
    p=subprocess.run(['git','-c','core.hooksPath=C:/NASA/Zhetalis-Nasa/.git/no-reference-hooks','-C',str(root),*args],capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=90)
    if required and p.returncode:raise RuntimeError(p.stderr.strip()[-700:])
    return p
def update(root):
    result={'folder':str(root)}
    try:
        result['before']=git(root,'rev-parse','HEAD').stdout.strip()
        dirty=git(root,'status','--porcelain').stdout.strip()
        result['dirty']=bool(dirty)
        git(root,'fetch','origin')
        tracking=git(root,'rev-parse','--abbrev-ref','--symbolic-full-name','@{u}',required=False)
        target=tracking.stdout.strip() if not tracking.returncode else git(root,'symbolic-ref','--short','refs/remotes/origin/HEAD',required=False).stdout.strip()
        result['target']=target
        if not target:result['status']='fetched; no tracking branch'
        elif dirty:result['status']='fetched; local edits preserved'
        elif git(root,'merge-base','--is-ancestor','HEAD',target,required=False).returncode:
            result['status']='fetched; divergent local history preserved'
        else:
            git(root,'merge','--ff-only',target)
            result['status']='current' if git(root,'rev-parse','HEAD').stdout.strip()==result['before'] else 'updated by fast-forward'
        result['after']=git(root,'rev-parse','HEAD').stdout.strip()
        if target:result['latest_remote']=git(root,'rev-parse',target).stdout.strip()
        result['commit']=git(root,'log','-1','--format=%h %cs %s',target or 'HEAD').stdout.strip()
    except Exception as error:result['status']='error';result['error']=str(error)
    return result
repos=[p for p in BASE.iterdir() if p.is_dir() and (p/'.git').exists()]
with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(update,repos))
OUT.write_text(json.dumps({'checked_singapore_date':'2026-11-15','repositories':results},indent=2))
for r in results:print(json.dumps({'repo':Path(r['folder']).name,'status':r['status'],'commit':r.get('commit'),'error':r.get('error')}),flush=True)
print('Report:',OUT)
