# Release notes

What each Cartulary release shipped, kept verbatim. The `Cartulary_v<version>_PatchNotes.txt` files are the patch notes, one per version from v1.4 on. Each `v<version>/` folder holds the text that release's zip carried, under its original file names; `v1.6/` also holds the itch page, the devlog, and the finals checklist, and `v1.6.1/` the devlog and the checklist. The application files aren't here: v1.6's and v1.6.1's are rebuilt byte for byte from their tags, and the earlier ones predate the repository.

| Release | Devlog posted (2026) | Zip's files dated (2026) | Here | Finals, sha256 (first 16 hex digits) |
|---|---|---|---|---|
| v1.0 | May 4 | May 3 to 4 | `v1.0/README.md` | `Cartulary.html` `75760b9e6e777397` |
| v1.1 | May 8 | May 5 to 7 | `v1.1/README.md`, `v1.1/devlog-1.1.md` | `Cartulary_v1.1.html` `b4d503a032ff47d1`, `Cartulary_v1.1_Readable.html` `63b9a6f8f334109a` |
| v1.2 | May 10 | May 9 to 10 | `v1.2/README.md`, `v1.2/Release_Changelog_v1.2.txt` | `Cartulary_v1.2.html` `9060090153ae6465`, `Cartulary_v1.2_Readable.html` `fe9b977b95848493` |
| v1.3 | May 14 | May 14 | `v1.3/README.md`, `v1.3/CHANGELOG.md` | `Cartulary_v1.3.html` `c5a705d4e2ce5051`, `Cartulary_v1.3_Readable.html` `9b3d87aa29511d16` |
| v1.4 | May 18 | May 18 | `v1.4/README.md`, `Cartulary_v1.4_PatchNotes.txt` | `Cartulary_v1.4.html` `755e95a722506f5e`, `Cartulary_v1.4_Readable.html` `b22f2e9e737af8ed` |
| v1.5 | June 27 | June 26 to 27 | `Cartulary_v1.5_PatchNotes.txt` | `Cartulary_v1.5.html` `c3a62e07e09b0194`, `Cartulary_v1.5_Readable.html` `05c6a83a7d088a5e` |
| v1.6 | October 23 | October 23 | `v1.6/`, `Cartulary_v1.6_PatchNotes.txt` | `Cartulary_v1.6.html` `b99381a041153d9d`, `Cartulary_v1.6_Readable.html` `e748142eadb3e1aa` |
| v1.6.1 | October 23 | October 23 | `v1.6.1/`, `Cartulary_v1.6.1_PatchNotes.txt` | `Cartulary_v1.6.1.html` `d9125ed013be5641`, `Cartulary_v1.6.1_Readable.html` `c10c693bbacbe9e6` |

The hashes are of the files in Drak's archive of every release, read on 2026-10-23. Nothing recorded the earlier releases' hashes when they shipped. Where a ship record exists, the archive agrees with it: v1.4's three HTML files have the byte counts `changelog-v1.4.md` gives, v1.5's match the sizes `changelog-v1.5.md` gives for the r134 finals (2.50 MB and 5.77 MB), v1.6's are the hashes in the handoff, which a clean checkout of the `v1.6` tag rebuilds, and v1.6.1's are the files in its zip, rebuilt from the `v1.6.1_r052` tag.

Notes on the originals, which are left as they shipped:

- v1.4's patch notes shipped as `Cartulary_v1.4_patchnotes.txt` and are renamed here to match the others; the content is unchanged. The v1.4 zip also held the working copy (`Cartulary_v1.4_WorkingFinal.html`, `6b45b54bee1538f9`) and a sample world, which the list of contents in its patch notes doesn't mention.
- v1.5's zip held no README: only the two builds and the patch notes.
- Two old records have the early dates wrong. `v1.3/CHANGELOG.md` puts v1.0 in March 2026 and v1.1 in April, and the frozen `changelog-v1.1-v1.3.md` puts v1.1 in late April, but their devlog posts are dated May 4 and May 8, and the files in their zips May 3 to 7.
- v1.6.1's zip carried its patch notes and its README as `README_v1.6.1.md`, which `v1.6.1/` keeps under that name.
- The early READMEs name files the zips don't hold under those names: v1.0's says `cartulary.html` for `Cartulary.html`, and v1.1's says `cartulary.html` and `cartulary-readable.html` for `Cartulary_v1.1.html` and `Cartulary_v1.1_Readable.html`.
