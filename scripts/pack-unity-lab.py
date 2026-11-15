"""Prune the Unity export's oversized surroundings and repack reachable geometry.

Only writes into the prepared internal lab. Original Downloads assets stay intact.
"""
from pathlib import Path
import json
import sys

folder = Path(sys.argv[1]).resolve()
expected = Path(__file__).resolve().parents[1] / 'game/internal/unity-model-lab/tuned'
assert folder == expected.resolve(), 'Only the internal tuned output may be changed'
g = json.loads((folder / 'scene.gltf').read_text(encoding='utf-8-sig'))
assert not g.get('skins') and not g.get('animations'), 'Animated assets require another packing path'
remove = {f'Object_{i}' for i in range(2, 13)}
for node in g['nodes']:
    if 'children' in node:
        node['children'] = [i for i in node['children'] if g['nodes'][i].get('name') not in remove]
reachable = set()
def visit(i):
    if i in reachable:
        return
    reachable.add(i)
    for child in g['nodes'][i].get('children', []):
        visit(child)
for scene in g['scenes']:
    for i in scene['nodes']:
        visit(i)
def mapping(items):
    return {old: new for new, old in enumerate(sorted(items))}
nodes = mapping(reachable)
meshes = mapping({g['nodes'][i]['mesh'] for i in reachable if 'mesh' in g['nodes'][i]})
materials = mapping({p['material'] for i in meshes for p in g['meshes'][i]['primitives'] if 'material' in p})
accessors = set()
for i in meshes:
    for primitive in g['meshes'][i]['primitives']:
        accessors.update(primitive['attributes'].values())
        if 'indices' in primitive:
            accessors.add(primitive['indices'])
accessors = mapping(accessors)
assert not any('sparse' in g['accessors'][i] for i in accessors)
raw = (folder / g['buffers'][0]['uri']).read_bytes()
packed = bytearray()
new_views = []
component_bytes = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
type_components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
for old in accessors:
    accessor = g['accessors'][old]
    view = g['bufferViews'][accessor['bufferView']]
    element_bytes = component_bytes[accessor['componentType']] * type_components[accessor['type']]
    stride = view.get('byteStride', element_bytes)
    start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    packed.extend(b'\0' * (-len(packed) % 4))
    new_start = len(packed)
    if stride == element_bytes:
        packed.extend(raw[start:start + accessor['count'] * element_bytes])
    else:
        for i in range(accessor['count']):
            packed.extend(raw[start + i * stride:start + i * stride + element_bytes])
    new_view = {'buffer': 0, 'byteOffset': new_start, 'byteLength': len(packed) - new_start}
    if 'target' in view:
        new_view['target'] = view['target']
    accessor['bufferView'] = len(new_views)
    accessor['byteOffset'] = 0
    new_views.append(new_view)
for i in meshes:
    for p in g['meshes'][i]['primitives']:
        p['attributes'] = {k: accessors[v] for k, v in p['attributes'].items()}
        if 'indices' in p:
            p['indices'] = accessors[p['indices']]
        if 'material' in p:
            p['material'] = materials[p['material']]
for i in nodes:
    n = g['nodes'][i]
    if 'mesh' in n:
        n['mesh'] = meshes[n['mesh']]
    if 'children' in n:
        n['children'] = [nodes[v] for v in n['children']]
for scene in g['scenes']:
    scene['nodes'] = [nodes[i] for i in scene['nodes']]

def texture_indices(value):
    found = set()
    if isinstance(value, dict):
        for key, item in value.items():
            if key.endswith('Texture') and isinstance(item, dict) and 'index' in item:
                found.add(item['index'])
            else:
                found.update(texture_indices(item))
    elif isinstance(value, list):
        for item in value:
            found.update(texture_indices(item))
    return found
textures = mapping(set().union(*(texture_indices(g['materials'][i]) for i in materials)))
images = mapping({g['textures'][i]['source'] for i in textures})
def remap_textures(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key.endswith('Texture') and isinstance(item, dict) and 'index' in item:
                item['index'] = textures[item['index']]
            else:
                remap_textures(item)
    elif isinstance(value, list):
        for item in value:
            remap_textures(item)
for i in materials:
    remap_textures(g['materials'][i])
for i in textures:
    g['textures'][i]['source'] = images[g['textures'][i]['source']]
for key, remap in [('nodes', nodes), ('meshes', meshes), ('accessors', accessors), ('materials', materials), ('textures', textures), ('images', images)]:
    g[key] = [g[key][i] for i in remap]
g['bufferViews'] = new_views
g['buffers'] = [{'uri': 'scene.bin', 'byteLength': len(packed)}]
(folder / 'scene.bin').write_bytes(packed)
(folder / 'scene.gltf').write_text(json.dumps(g, separators=(',', ':')), encoding='utf-8')
stats_file = folder.parent / 'asset-stats.json'
stats = json.loads(stats_file.read_text(encoding='utf-8-sig'))
stats['tunedGeometryBytes'] = len(packed)
stats['tunedTextureBytes'] = sum((folder / i['uri']).stat().st_size for i in g['images'])
stats['removedEnvironmentNodes'] = sorted(remove)
stats['tunedTriangles'] = sum(g['accessors'][p['indices']]['count'] // 3 for m in g['meshes'] for p in m['primitives'])
stats['tunedTextureRGBABytesWithMipmaps'] = round(len(images) * 512 * 512 * 4 * 4 / 3)
stats['note'] = 'Texture memory is an RGBA8+mipmap estimate. Tuned model removes export terrain and uses lit 512px textures. Source files untouched.'
stats_file.write_text(json.dumps(stats, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'tunedGeometryBytes': len(packed), 'tunedTriangles': stats['tunedTriangles'], 'activeTextures': len(images)}))
