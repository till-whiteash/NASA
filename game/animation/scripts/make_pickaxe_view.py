import bpy, math
from pathlib import Path
from mathutils import Vector
GAME=Path(__file__).resolve().parents[2]
OUT=GAME/'animation/previews/pickaxe-view'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(GAME/'assets/tools/rock-pick.glb'))
def material(name,col):
 m=bpy.data.materials.new(name);m.use_nodes=True
 n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*col,1);n.inputs['Roughness'].default_value=.65
 return m
white=material('EVA woven glove',(.65,.68,.69));dark=material('Grip palm',(.09,.11,.12));orange=material('Wrist safety band',(.85,.18,.035))
def ellipsoid(name,pos,scale,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=pos)
 o=bpy.context.object;o.name='SM_'+name;o.scale=scale;o.data.materials.append(mat)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for p in o.data.polygons:p.use_smooth=True
 return o
ellipsoid('glove_palm',(0,.035,.095),(.047,.035,.065),white)
for i in range(4):
 o=ellipsoid('curled_finger_'+str(i),(.006,-.006,.045+i*.029),(.037,.031,.0135),white)
 o=ellipsoid('finger_pad_'+str(i),(.008,-.027,.045+i*.029),(.023,.009,.011),dark)
ellipsoid('thumb',(-.037,.004,.13),(.021,.031,.033),white)
ellipsoid('wrist',(0,.06,-.015),(.047,.045,.06),white)
ellipsoid('forearm',(0,.10,-.105),(.055,.052,.085),white)
ellipsoid('cuff_band',(0,.065,-.035),(.05,.047,.015),orange)
for o in bpy.context.scene.objects:
 if o.type=='MESH' and not o.name.startswith('SM_'):o.name='SM_'+o.name
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'pickaxe-view.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'rock-pick-view.glb'),export_format='GLB',export_apply=True,export_yup=True)
camdata=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',camdata);bpy.context.scene.collection.objects.link(cam);cam.location=(.65,-1,.55);cam.rotation_euler=(Vector((0,0,.18))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=.85;bpy.context.scene.camera=cam
ld=bpy.data.lights.new('Softbox','AREA');ld.energy=120;ld.shape='DISK';ld.size=1
light=bpy.data.objects.new('Softbox',ld);bpy.context.scene.collection.objects.link(light);light.location=(.5,-.6,1);light.rotation_euler=(Vector((0,0,.2))-light.location).to_track_quat('-Z','Y').to_euler()
s=bpy.context.scene;s.render.engine='BLENDER_EEVEE';s.render.resolution_x=700;s.render.resolution_y=800;s.render.resolution_percentage=100;s.render.filepath=str(OUT/'review.png');s.render.image_settings.file_format='PNG';s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
bg=next(n for n in s.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.12,.15,.2,1);bg.inputs['Strength'].default_value=.5
bpy.ops.render.render(write_still=True)
print('ASSET',str(OUT/'rock-pick-view.glb'))
