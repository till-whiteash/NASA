"""Dedicated first-person EVA glove: four curled fingers, opposing thumb and a pressure cuff.
Authored in metres around the existing rock-pick grip; +Y is the tool handle in glTF.
Run in an isolated Blender process. No downloaded or generated character assets.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/tools/eva-grip.glb'
PHOTO=Path(r'C:\Users\Lenovo\.codex\visualizations\2026\11\13\01a1d56b-ef59-7f00-bbce-93101280eea1\pioneer\power-models-after\eva-grip-blender.png')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def xyz(p):return Vector((p[0],-p[2],p[1]))
def material(name,col,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*col,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;return m
fabric=material('EVA woven outer shell',(.79,.80,.76));pad=material('Flexible reinforced finger pads',(.43,.46,.44),.92);seam=material('Stitching and flex creases',(.43,.44,.40));band=material('Pressure wrist disconnect',(.14,.18,.21),.4,.5);trim=material('Locking cuff trim',(.56,.58,.54),.45,.6)
def ellipsoid(name,p,size,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=14,location=xyz(p));o=bpy.context.object;o.name=name;o.scale=(size[0]/2,size[2]/2,size[1]/2);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
 return o
def line(name,points,r,mat,radii=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r;c.bevel_resolution=3;c.use_fill_caps=True
 s=c.splines.new('NURBS');s.points.add(len(points)-1)
 for i,(p,v) in enumerate(zip(s.points,points)):p.co=(*xyz(v),1);p.radius=(radii[i] if radii else 1)
 s.order_u=min(4,len(points));s.use_endpoint_u=True;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o
ellipsoid('Sculpted padded palm',(.065,.083,.013),(.095,.15,.082),fabric)
ellipsoid('Palm contact cushion',(.043,.082,-.01),(.045,.123,.055),pad)
for i,y in enumerate([.136,.103,.07,.038]):
 points=[(.065,y,.026),(.04,y+.003,.047),(.0,y+.002,.053),(-.034,y-.002,.034),(-.043,y-.006,.002),(-.027,y-.01,-.029),(.004,y-.012,-.034)]
 line(['Index','Middle','Ring','Little'][i]+' finger - curled',points,.0145 if i<3 else .013,fabric,[1.05,1.12,1,.96,.95,.9,.73])
 for j,(x,z) in enumerate([(.012,.052),(-.037,.022)]):
  line('Finger flex seam',[(x-.003,y-.012,z),(x,y,z+.001),(x+.003,y+.012,z)],.0011,seam)
 ellipsoid('Reinforced fingertip',(-.016,y-.011,-.032),(.035,.026,.012),pad)
line('Opposing thumb',[(.073,.139,-.003),(.061,.171,.008),(.024,.18,.031),(-.007,.165,.053),(-.025,.142,.055)],.019,fabric,[1.1,1.08,1,.92,.75])
ellipsoid('Thumb contact pad',(-.021,.143,.041),(.028,.032,.011),pad)
# The forearm leaves the wrist diagonally towards the lower right of the view.
line('Pressurised sleeve',[(.115,.056,.025),(.18,.014,.055),(.245,-.065,.1),(.65,-.5,.28)],.05,fabric,[.81,.94,1.05,1.15])
axis=xyz((.075,-.07,.04)).normalized()
for t,r,minor,mat,name in [(0,.048,.012,band,'Pressure cuff'),(.018,.051,.006,trim,'Cuff locking lip'),(-.018,.047,.005,trim,'Cuff glove lip')]:
 pos=xyz((.145,.032,.045))+axis*t;bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=minor,major_segments=32,minor_segments=8,location=pos);o=bpy.context.object;o.name=name;o.rotation_euler=axis.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
for j in range(3):line('Sleeve stitched fold',[(.20+j*.026,-.012-j*.033,.086+j*.012),(.226+j*.026,-.003-j*.033,.102+j*.012),(.247+j*.026,-.02-j*.033,.092+j*.012)],.002,seam)
line('Dorsal seam',[(.106,.04,.045),(.10,.08,.051),(.09,.115,.048),(.075,.14,.042)],.0016,seam)
for o in list(bpy.context.scene.objects):
 if o.type=='CURVE':bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
OUT.parent.mkdir(exist_ok=True,parents=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',export_yup=True,export_apply=True)
# Preview the fitted glove around a simple grip of the same radius as the game pick.
bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.025,depth=.6,location=xyz((0,.23,0)));o=bpy.context.object;o.data.materials.append(material('Preview handle',(.12,.13,.14)))
sc=bpy.context.scene;sc.render.engine='BLENDER_EEVEE';sc.render.resolution_x=950;sc.render.resolution_y=750;sc.render.resolution_percentage=100
world=bpy.data.worlds.new('Glove studio');sc.world=world;world.use_nodes=True;next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs['Color'].default_value=(.13,.15,.18,1)
for name,p,power,size in [('Key',(.4,.5,.6),40,.6),('Fill',(-.5,.1,.35),20,.5)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);sc.collection.objects.link(o);o.location=xyz(p);o.rotation_euler=(xyz((.08,.06,0))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Preview');o=bpy.data.objects.new('Preview',d);sc.collection.objects.link(o);o.location=xyz((-.28,.30,.53));o.rotation_euler=(xyz((.10,.04,.02))-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=.55;sc.camera=o
sc.render.filepath=str(PHOTO);bpy.ops.render.render(write_still=True)
print(json.dumps({'model':str(OUT),'bytes':OUT.stat().st_size,'preview':str(PHOTO)}))
