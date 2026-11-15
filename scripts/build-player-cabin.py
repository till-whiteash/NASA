"""Make the player variant while preserving the source's compressed skin/rig.

Can run in Python or through Blender MCP. Editing the GLB document directly
keeps Mixamo's original rest-bone axes compatible with the shared crew clips.
"""
from pathlib import Path
import json, hashlib, struct, re

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'game/assets/crew/ch48.glb'
OUT = BASE.with_name('player-cabin.glb')
raw = BASE.read_bytes()
json_size = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20 + json_size])
binary_chunks = raw[20 + json_size:]
nodes = doc['nodes']
parents = {child: i for i, node in enumerate(nodes) for child in node.get('children', [])}
norm = lambda name: re.sub(r'_\d+$', '', re.sub(r'^mixamorig\d*', '', name))
changed = []
for i, node in enumerate(nodes):
    if norm(node.get('name', '')) == 'Head' and norm(nodes[parents[i]].get('name', '')) != 'Head':
        scale = node.get('scale', [1, 1, 1])
        node['scale'] = [scale[0] * .93, scale[1] * 1.035, scale[2]]
        changed.append(node['name'])
for mat in doc['materials']:
    if 'hair' in mat.get('name', '').lower():
        pbr = mat.setdefault('pbrMetallicRoughness', {})
        color = pbr.get('baseColorFactor', [1, 1, 1, 1])
        pbr['baseColorFactor'] = [color[0] * .20, color[1] * .115, color[2] * .075, color[3]]
        pbr['roughnessFactor'] = .9
doc.setdefault('extras', {})['characterRole'] = 'Player cabin avatar'
encoded = json.dumps(doc, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
size = 20 + len(encoded) + len(binary_chunks)
OUT.write_bytes(struct.pack('<4sIII4s', b'glTF', 2, size, len(encoded), b'JSON') + encoded + binary_chunks)
meta = {'base': 'game/assets/crew/ch48.glb',
        'original_source': 'source-assets/crew/Ch48_nonPBR.fbx (Mixamo)',
        'base_sha256': hashlib.sha256(raw).hexdigest(),
        'sha256': hashlib.sha256(OUT.read_bytes()).hexdigest(),
        'role': 'Player cabin avatar; Director Hale uses Ch23',
        'modified_head_bones': changed,
        'modifications': ['Narrower, slightly longer head proportions', 'Darker hair material']}
OUT.with_suffix('.source.json').write_text(json.dumps(meta, indent=2) + '\n')
print(json.dumps({'file': str(OUT), 'bytes': OUT.stat().st_size, 'head_bones': changed}))
