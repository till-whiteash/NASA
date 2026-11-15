# Complete downloaded NASA model library

The complete NASA 3D archive downloaded for Zhetalis is in `pull/nasa-3d/`, including GLBs, printable STLs, editable originals, textures, previews and compressed/split source archives. The archive is pinned to NASA commit `11ebb4ee043715aefbba6aeec8a61746fad67fa7`.

See [all 257 GLB models](pull/catalog/MODELS.md), [the source download hashes](pull/catalog/nasa-downloads.json), [uploaded inventory](pull/catalog/upload-inventory.json), and [source and usage notes](pull/SOURCES-AND-USAGE.md). Keep original notices and contributor credits. NASA branding and third-party materials retain their applicable restrictions.

## Download actual files

Install Git LFS, then clone this repository and run `git lfs pull`. NASA archive files use Git LFS; downloading raw Git pointers does not download the model content. All parts of split `.7z.001` archives are included and must remain together to extract.

Runtime game models and their dependencies remain in `game/assets/`. Editable team-made models are in `source-assets/space-pack/`. These copies are kept separate from the original NASA archive; no game loader is changed by this upload.

Raw Mixamo FBX files are not added by this upload because the local source documentation prohibits standalone redistribution. Existing repository history is unchanged. Research PDFs, unrelated AI model weights, private configuration, and local tools are not part of this model collection.
