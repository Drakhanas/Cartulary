"""r050: the help read against the v1.6 app, eight topics (release prep).

The handoff's in-app-help backlog, carried since v1.5, turned out already
clear: all twelve items read fixed in the tree, and a cross-check of every
bold label in the help (494) against the whole source found no control that
does not exist. What this cut fixes is what a targeted read of the eight
topics adjacent to the v1.6 changes found (Getting Started, Save & Share,
Templates, Concordance, Search, Sharing With Players, Browser Compatibility,
Things That Aren't Features):

- Save & Share names "the Family view" twice; the view has been Linea since
  v1.2's overhaul.
- Templates lists the default set in an order that is neither the shipped
  order nor alphabetical (Book sits after Deity; House after Historical
  Event), and then says the list "ships in alphabetical order", which the
  shipped order has not been since House joined it after Faction at v1.5.
  The list is put in the shipped order and the sentence says so.
- Concordance says "every entry" is a node and omits the registered node
  sources that have graphed since v1.5 (astronomical bodies, the nine
  Glossopoeia kinds) and v1.6 (maps), each with its own row in the Templates
  filter; and it calls a map a "map entry", which it has not been since r001.
- Search says pin labels are not searched; the whole map is not, since maps
  are records with their own list.
- Sharing With Players says the images zip includes "maps"; it includes map
  images and painted layers, not the drawing, which travels only in the HTML
  export.
- Browser Compatibility says nothing about the map editor's input, which is
  the one place v1.6 added pen and touch.

The site, outside the gate, in the same commit: the Concordance page's
node-source list gains Maps; the Stemma page's "no undo, in keeping with the
rest of Cartulary" (false since r034); the search caveat matches the help.

Decided at the fork (Drak, 2026-10-22): the targeted read (1C), the site
fixes folded into this cut (2), one release-notes file per version (3A),
a checklist plus the probes on the finals (4A).

Declared scope: 26_home-data; site/helloworld.html outside the tree.

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r049 tree: python3 inlining/cuts/r050_help_sweep.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
HELP = ROOT / "cartulary-src" / "modules" / "26_home-data.jsx"
SITE = ROOT / "site" / "helloworld.html"


def edit(path, pairs):
    s = path.read_text(encoding="utf-8")
    for old, new in pairs:
        c = s.count(old)
        assert c == 1, f"{path.name}: anchor occurs {c} times: {old[:80]!r}"
        s = s.replace(old, new)
    path.write_text(s, encoding="utf-8")


HELP_EDITS = [
    # Save & Share: the view is Linea
    ("**Family tree markdown export.** The Family view has an **Export tree as Markdown ↓** button below the Focal selector.",
     "**Family tree markdown export.** Linea has an **Export tree as Markdown ↓** button below the Focal selector."),
    ("The export uses the same parent-side rules as the Family view (label hints first, ID-sort fallback).",
     "The export uses the same parent-side rules as Linea (label hints first, ID-sort fallback)."),
    # Templates: the shipped order, and the sentence that claims it
    ("- **Artifact / Object / Currency** — items of significance, including coinage and currencies\n- **Character** — people with personality, history, family\n",
     "- **Artifact / Object / Currency** — items of significance, including coinage and currencies\n- **Book / Document / Text / Tome** — books, codices, letters, scrolls, prophecies, inscriptions\n- **Character** — people with personality, history, family\n"),
    ("- **Deity / Entity** — gods, primordials, archfiends, spirits\n- **Book / Document / Text / Tome** — books, codices, letters, scrolls, prophecies, inscriptions\n- **Faction / Government / Organization** — organizations, governments, guilds, courts, religious orders\n- **Festival / Holiday** — recurring observances\n- **Historical Event** — one-time events with causes and consequences\n- **House / Dynasty / Clan / Bloodline**: noble houses, dynasties, clans, bloodlines, and other kin-groups\n- **Location** — places, regions, geography\n",
     "- **Deity / Entity** — gods, primordials, archfiends, spirits\n- **Faction / Government / Organization** — organizations, governments, guilds, courts, religious orders\n- **House / Dynasty / Clan / Bloodline**: noble houses, dynasties, clans, bloodlines, and other kin-groups\n- **Festival / Holiday** — recurring observances\n- **Historical Event** — one-time events with causes and consequences\n- **Location** — places, regions, geography\n"),
    ("Drag to reorder. The default list ships in alphabetical order; whatever order you set is what the sidebar uses.",
     "Drag to reorder. The default list ships in the order above (alphabetical, except that House follows Faction, where it was added); whatever order you set is what the sidebar uses."),
    # Concordance: the registered node sources, and a map is a record
    ("Concordance (formerly known as the Relationships graph) renders every entry as a node and every cross-reference as an edge.",
     "Concordance (formerly known as the Relationships graph) renders every entry as a node and every cross-reference as an edge, and the world's other node sources beside the entries: Astronomical Bodies (each orbiting its parent along an \"orbits\" edge), ConLangs with their Lexemes, Phonemes, Grammatical Values, Affixes, Word-Building Processes, Inflection Classes, and Writing Systems, and Maps. Each of those is its own row in the Templates filter, and a reference to one from a field or a wiki-link is an edge like any other."),
    ("- **Map pins** that link to other entries. The map entry connects to whatever its pins point at.",
     "- **Map pins** that link to other entries. The map's node connects to whatever its pins point at, with a 📍 on the edge."),
    # Search: the whole map is outside the entry search
    ("- **Map pin labels.** These live on \\`mapData\\`, not in fields.",
     "- **Maps.** Maps are records in Cartographia, not entries, so neither a map's fields nor its pin labels are searched here; the Cartographia index lists them by name."),
    # Sharing With Players: what the zip carries of a map
    ("**Markdown + images zip.** Same as above but with maps, portraits, and location art included.",
     "**Markdown + images zip.** Same as above but with map images and painted layers, portraits, and location art included. A map's drawing is not in it; the drawing travels only in the HTML export and the per-map SVG and PNG downloads."),
    # Browser Compatibility: the map editor's input
    ("**IndexedDB** and **JSZip** (Markdown + images export) are universal across modern browsers.",
     "**The map editor** takes a mouse, a pen, or a finger through pointer events, which every current browser has; a pen's eraser end is read where the browser reports it as such. Painted layers in folder mode follow the File System Access rule above. The PNG download caps itself at sixteen million pixels because Safari draws nothing past that.\n\n**IndexedDB** and **JSZip** (Markdown + images export) are universal across modern browsers."),
]

SITE_EDITS = [
    ("Astronomical Bodies defined in Ephemeris appear as their own toggleable type, as do Glossopoeia entities -- ConLangs, Lexemes, Phonemes, Grammatical Values, Affixes, Word-Building Processes, Inflection Classes, and Writing Systems. Any of these that reference entries (or each other) produce edges just like a field on a regular template would.",
     "Astronomical Bodies defined in Ephemeris appear as their own toggleable type, as do Glossopoeia entities -- ConLangs, Lexemes, Phonemes, Grammatical Values, Affixes, Word-Building Processes, Inflection Classes, and Writing Systems -- and, since v1.6, Maps. Any of these that reference entries (or each other) produce edges just like a field on a regular template would."),
    ("There's no undo, in keeping with the rest of Cartulary, so export before a big rearrangement.",
     "There's no undo (the map editor is the one place in Cartulary that has it), so export before a big rearrangement."),
    ("map pin labels (stored on mapData, not in fields), and former-name resolution",
     "maps (records in Cartographia with their own list, so neither their fields nor their pin labels), and former-name resolution"),
]


def main():
    edit(HELP, HELP_EDITS)
    edit(SITE, SITE_EDITS)
    before = sum(o.count("—") for o, _ in HELP_EDITS + SITE_EDITS)
    after = sum(n.count("—") for _, n in HELP_EDITS + SITE_EDITS)
    assert after == before, f"em dashes went {before} -> {after}; the cut adds none (the Templates bullets keep theirs)"
    print("r050 applied: 26_home-data (ten edits across six topics), site/helloworld.html (three)")


if __name__ == "__main__":
    main()
