"""Export Claude's articulated Z-2 and reusable gameplay actions through Blender."""
import bpy, sys, math, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'source-assets/blender/z2-gameplay'
OUT = ROOT/'game/assets/models/nasa-spacesuits'
sys.path.insert(0,str(SOURCE))
import common as c
import astro_kit as ak
c.GAME=str(ROOT/'game')
c.ASSETS=str(ROOT/'game/assets')

c.reset('Z2_gameplay',20)
c.set_stretch(1)
root, arm = ak.astronaut('z2_player')
clips=[]
def begin(name,start,end):
    ak.stand(arm,start);ak.stand(arm,end)
    clips.append((name,start,end))

begin('Idle',0,48)
for f in range(0,49,4):
    ak.pose(arm,f,spine=(math.sin(f/48*math.tau)*.7,0,0))
begin('Walk',60,108)
c.A.key(root,60,loc=(0,0,0));c.A.key(root,108,loc=(0,-2.4,0))
ak.walk(arm,root,60,108)
begin('Run',120,152)
c.A.key(root,120,loc=(0,0,0));c.A.key(root,152,loc=(0,-2.4,0))
ak.walk(arm,root,120,152)
# Continuous loop boundaries, including the knee that is bent on passing contact.
for first,last in [(60,108),(120,152)]:
    for keys in c.A.k[arm.name].values():
        if first in keys and last in keys:keys[first]=keys[last]
begin('Jump',164,200)
ak.pose(arm,173,thigh_n=(-30,0,0),thigh_p=(-16,0,0),shin_n=(50,0,0),shin_p=(38,0,0),**ak.arms(24,20,bend_p=35,bend_n=35))
ak.pose(arm,186,thigh_n=(-18,0,0),thigh_p=(5,0,0),shin_n=(30,0,0),shin_p=(20,0,0),**ak.arms(16,12))
begin('Dig',212,264)
ak.dig(arm,212,264,rate=26)
begin('Carry',276,324)
ak.carry(arm,276,324)
begin('Repair',336,384)
ak.repair(arm,336,384,rate=24)
begin('Crouch',396,444)
for f in [396,444]:
    ak.pose(arm,f,thigh_n=(-40,0,0),thigh_p=(-40,0,0),shin_n=(80,0,0),shin_p=(80,0,0),spine=(14,0,0),**ak.arms(16,16,bend_p=35,bend_n=35))
begin('Kneel',456,480)
ak.pose(arm,456,**ak.KNEEL,**ak.arms(35,35,bend_p=40,bend_n=40))
ak.pose(arm,480,**ak.KNEEL,**ak.arms(35,35,bend_p=40,bend_n=40))

# Runtime physics drives travel and jumping. Keep every exported action in place.
c.A.k.pop(root.name,None)
root.location=(0,0,0)
c.A.build(clips);c.A.to_nla()
bpy.context.scene.frame_set(0)
root['source']='NASA Z2 Spacesuit / Claude astro_kit articulated rig'
root['height_metres']=1.85
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for o in [root]+list(root.children_recursive):o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'z2-gameplay.glb'),export_format='GLB',use_selection=True,
    export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,
    export_frame_step=1,export_anim_slide_to_zero=False,export_image_format='JPEG',export_image_quality=85,
    export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
(OUT/'z2-gameplay.json').write_text(json.dumps({'source':'NASA/LaRC/Advanced Concepts Lab, articulated with Claude astro_kit.py','rig_source':'source-assets/blender/z2-gameplay/astro_kit.py','clips':[n for n,_,_ in clips],'height':1.85,'root_motion':False},indent=2))
print('Z2_GAMEPLAY_EXPORTED', (OUT/'z2-gameplay.glb').stat().st_size)
