# Cartulary

Cartulary is a worldbuilding application in one HTML file. Open it in a browser and build a world: typed templates for characters, places, factions, and the rest; your own templates when those don't fit; family trees, a cross-reference graph, timelines, custom calendars, a conlang workspace, orbital mechanics for your sky, and maps you draw inside the tool. No account, no cloud, no subscription, no telemetry. Your world is a .json file on your disk that you can read in a text editor.

- **Download:** [drakhanas.itch.io/cartulary](https://drakhanas.itch.io/cartulary). The zip holds the build to run, a Readable build with the source intact, and a getting-started README. Nothing in this repository needs to be built to use Cartulary.
- **Documentation:** [cartulary.world](https://cartulary.world), and the same guide inside the application under ◐ Home.
- **Bugs and questions:** [issues](https://github.com/Drakhanas/Cartulary/issues) here, comments on the itch.io page, or the [Discord](https://discord.gg/zWMKXfZtcC).
- **License:** MIT. See [LICENSE](LICENSE) and the license section below.

Cartulary was built with Claude as the implementation partner under human direction and is disclosed as REAL Rating Level 4; the long version is on the itch.io page. The application has no AI features at runtime.

## What this repository is

The single file users download is assembled from this tree. The repository holds the source, the build that assembles it, the checks that gate every change, and the project's own working documents.

```
cartulary-src/
  shell.html                    the page: head, CSS, library tags, one sentinel where the body goes
  modules/NN_name.jsx           the application, in assembly order; a directory holds a module in parts
  reference-rNNN-body.jsx       the frozen anchor: the body the tree must reassemble to, byte for byte
  reference-rNNN-layout.json    which lines of the anchor each module owns
inlining/
  build_inline.py               verify, working, edit, gather, freeze, finals
  canonicalize.py               the canonical form the parity check compares
  compile_jsx.js                precompiles the JSX for the production build
  validate_html.js              parses every inline script of a built file
  prove_gate_teeth.py           proves the build gates still fail on what they should
  cuts/                         one script per content change since v1.6's r025, string-anchored
babelcheck/check.js             the parse gate: the assembled body must parse as JSX
tools/turnover/                 the documentation gate and its conventions
docs/                           handoff, changelog, roadmap, doctrine, specs, release notes, journal
packs/                          the Space Opera template pack and the pack builder
site/                           cartulary.world: the landing page and the documentation page
deps/                           pinned tarballs of every library the build inlines; no network needed
```

Assembly is ordered concatenation. `shell.html` has one sentinel, `@@CARTULARY_BABEL_BODY@@`; the modules under `cartulary-src/modules/` are concatenated in filename order and injected there. Nothing resolves dependencies or reorders declarations, which is what lets the tree be checked against a frozen copy of the whole body.

## Building

Python 3 and Node (CI uses 3.12 and 22). Every library the build needs is a tarball in `deps/`, so a clone builds offline.

```sh
# the tree reassembles to the frozen anchor, byte for byte
python3 inlining/build_inline.py verify

# assemble the development HTML: library tags in the head, JSX compiled in the browser
# -> inlining/out/cartulary-working.html
python3 inlining/build_inline.py working

# the parse gate
mkdir -p babelcheck/node_modules/@babel/parser
tar -xzf deps/parser-7.25.3.tgz -C babelcheck/node_modules/@babel/parser --strip-components=1
node babelcheck/check.js
```

The release builds inline every library and font and precompile the JSX. Extract the tarballs into `inlining/node_modules/` first (scoped packages under `@babel/` and `@fontsource/`):

```sh
for t in deps/*.tgz; do
  n=$(basename "$t" .tgz); n=${n%-[0-9]*}
  case $n in
    babel-standalone|helper-string-parser|helper-validator-identifier|parser|types)
      d=inlining/node_modules/@babel/${n#babel-} ;;
    fontsource-*) d=inlining/node_modules/@fontsource/${n#fontsource-} ;;
    *) d=inlining/node_modules/$n ;;
  esac
  mkdir -p "$d"; tar -xzf "$t" -C "$d" --strip-components=1
done

python3 inlining/build_inline.py finals
node inlining/validate_html.js inlining/out/Cartulary_v1.6.1.html
node inlining/validate_html.js inlining/out/Cartulary_v1.6.1_Readable.html
```

`finals` writes two files to `inlining/out/`, named for the version in `inlining/build_inline.py`: `Cartulary_v1.6.1.html`, the precompiled build users run, and `Cartulary_v1.6.1_Readable.html`, the same application with the JSX intact and Babel inside to compile it. The build is deterministic: a clean checkout of a release's tag produces the files shipped on itch.io for it, byte for byte (the `v1.6` tag produces v1.6's).

## How a change is made

Every change to the application is one of two kinds, and each has a gate.

A **content change** edits the modules through a script in `inlining/cuts/` and is checked by `build_inline.py edit`, which takes the files the change declares and the declarations it adds or removes, and requires every undeclared file to be byte-identical to its segment of the anchor. The assembled file must then parse (`babelcheck/check.js`). After the change has been passed in a browser, `build_inline.py freeze rNNN` rotates the anchor to the new tree.

A **pure reorganization** (carving a module out of a larger one, renumbering) changes no byte of the body. `build_inline.py verify` reassembles the tree, canonicalizes it, and compares it to the anchor; anything but an exact match fails.

Each change is tagged, on the commit where its gates went green, as `v<version>_rNNN`: the version it belongs to and its revision number. A patch continues its version's count: v1.6.1's fix, `v1.6.1_r052`, came after v1.6's r051 and is the first tag in this naming. A new minor version starts over, so v1.7's first change will be `v1.7_r001`. A release is tagged `v<version>_Release` on the commit that records it as shipped, so v1.6.1's will be `v1.6.1_Release`. The tags from before this naming are `r030` through `r051`, all v1.6, and `v1.6`, which marks the v1.6 release.

A change's script in `inlining/cuts/` carries the same name, so v1.7's first will be `v1.7_r001_<description>.py`; v1.6's are `r025_sweep.py` through `r051_font_inline.py`. From r031 on, each one run against the tag before it reproduces its change exactly. r025 through r030 came into the repository with the tree already past them, so they're a record of what ran, not something to re-run.

`inlining/prove_gate_teeth.py` and `tools/turnover/prove_teeth.py` inject one defect at a time into a throwaway copy of the tree or the docs and prove each gate still fails on what it should, so a gate that has gone quiet is caught. The project shipped two that had been scoring wrong for twenty revisions before these existed.

The project's working documents in `docs/` are gated too. `tools/turnover/check_docs.py` checks the handoff, changelog, roadmap, doctrine, manifest, and journal against the tree and against `docs/facts.json`: file names that no longer exist, line counts that drifted, claims that disagree with the source. The conventions are in `tools/turnover/conventions.md`.

The GitHub Actions workflow in `.github/workflows/` runs all of this on every push: verify, working, the parse gate, the gate teeth, the doc gate, and the doc-gate teeth, with nothing fetched from the network.

## The documents

`docs/` is the project's own record, written for the next working session rather than for a reader, and kept honest by the doc gate.

- `handoff.md`: where the project stands and how work is done in it: the cold start, the gates, the procedures. A version's handoff is frozen at its close as `handoff-v<version>.md`.
- `changelog.md` and the per-version changelogs: what changed and why, cut by cut, with the verification each change had.
- `roadmap.md`, `roadmap-principles.md`, `roadmap-archive.md`: what is planned, the rules for planning it, and the plans of the versions that shipped.
- `cartulary-doctrine.md`, `doctrine-code-watch.md`, `doctrine-site.md`: standing rules learned from mistakes, each with the mistake that taught it.
- `cartulary-spine-manifest.md`: the module tree with line counts and what each module holds.
- `cartographia-plus-spec.md`, `maps-promotion-spec.md`, and the Glossopoeia documents: the specs the larger features were built from.
- `release-notes/`: what each release shipped, verbatim: the patch notes, the text in each zip, and an index with every release's finals hashes; for v1.6, also the public copy and the finals checklist.

The save-file format has no separate document. It is the in-app help's JSON Save File Schema topic (Home, then JSON Save File Schema; the text lives in the help module under `cartulary-src/modules/`), and cartulary.world's [JSON Structure](https://cartulary.world/helloworld.html#json-structure) page. The in-app topic doesn't document the `longform` and `grid` field shapes yet, and the site's `grid` shape is wrong; the fix is on the roadmap.

## Contributing

Bug reports and suggestions as [issues](https://github.com/Drakhanas/Cartulary/issues) are welcome, with the browser and a save file that reproduces the problem when one exists. Cartulary is a hobby project with no release schedule; everything filed gets read.

Code changes go through the gates above. A pull request that changes the modules without rotating the anchor fails `verify`, and the anchor rotates only after the maintainer has passed the change in a browser, so a pull request can't land on its own. If you want to change something, open an issue first and say what; the change can then go through the cut process.

## License

Cartulary is released under the MIT License (see [LICENSE](LICENSE)). The libraries it inlines (React, Babel, marked, d3, JSZip) are MIT; the fonts (Cormorant Garamond and DM Sans) are under the SIL Open Font License 1.1. The built files carry the full license texts in a comment block at the top.
