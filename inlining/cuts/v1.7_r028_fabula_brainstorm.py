"""v1.7 r028: Fabula's Brainstorm.

Stemma v2's third cut (docs/stemma-v2-spec.md, section 5; the plan's item
3, approved 2026-10-27), and the Story's one parked field (docs/fabula-spec.md,
sections 1 and 5.2: "Brainstorm waits for Stemma v2", Drak, 2026-10-25). Now
that stemmas are a registered source (r027), the Story seed takes
Brainstorm, a multi-target link to `__stemmas__`, between Threads and Notes
among the Story's own fields, where Threads already is the story's other
link out; it is not core, since nothing in Fabula reads it yet, so an
edited Story schema is left as the user has it, by the seed's rule. The
seed goes to 5, and with the bump the three `reads` lines written before
r020 built the timeline stop saying it will: an arc's Turning Points, a
scene's POV and its When. The help's schema topic and the site's seed table
follow the seed, since the probe r024 left holds them to it, and both pages'
Story-tab sentences name the field.

- 28_fabula/00_seed: the seed to 5 with its comment; the Story's
  `brainstorm` field; the three lines.
- 26_home-data: the schema topic's seed number and its Story line; the
  Fabula topic's Story-tab sentence.
- site/helloworld.html: the JSON Structure page's seed number, twice, and
  its Story table's row; the Fabula page's Story-tab sentence.

Declared scope: 28_fabula/00_seed, 26_home-data (and site/helloworld.html,
which the gate never sees: read `git diff -- site/`).
Declarations added: none.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r028_fabula_brainstorm.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for pair in pairs:
        old, new = pair[0], pair[1]
        count = pair[2] if len(pair) > 2 else 1
        n = text.count(old)
        assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:200]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


SEED_OLD = """// the core list caught up with what r007 through r015 read, a row's details
// included, each core field took the line the builder shows for what reads
// it, and the plot point's name help stopped saying a structure makes one
// (Drak, at r017's plan, 2026-10-26).
const FABULA_SCHEMA_SEED = 4;
"""
SEED_NEW = """// the core list caught up with what r007 through r015 read, a row's details
// included, each core field took the line the builder shows for what reads
// it, and the plot point's name help stopped saying a structure makes one
// (Drak, at r017's plan, 2026-10-26), and 5 since r028, when the Story took
// Brainstorm, the stemmas behind it, once stemmas were a registered source
// (r027), and three core fields' lines stopped saying the timeline will,
// r020 having built it (Drak's plan for Stemma v2, 2026-10-27).
const FABULA_SCHEMA_SEED = 5;
"""

STORY_OLD = """      ref("threads", "Threads", "The plot threads this story carries; one thread can run through several stories.", ["Plot Thread"], core("The Plot tab lists them.", MANY)),
      area("notes", "Notes", "Anything else about the story."),
      ...inPanel("premise", ["""
STORY_NEW = """      ref("threads", "Threads", "The plot threads this story carries; one thread can run through several stories.", ["Plot Thread"], core("The Plot tab lists them.", MANY)),
      // v1.7 r028: the stemmas behind the story, a registered source since
      // r027, named and id'd directly since the seed's target() resolves
      // templates and the two older sources alone. Not core: nothing reads it.
      f("brainstorm", "Brainstorm", "entry-ref", "The stemmas behind this story, rota or tabula; a chip opens one on its canvas.", { refTemplates: [STEMMA_REF_LABEL], refTemplatesId: [SYNTH_TPL_STEMMA], ...MANY }),
      area("notes", "Notes", "Anything else about the story."),
      ...inPanel("premise", ["""

WILL_1_OLD = '      ], core("The timeline will mark them.")),\n'
WILL_1_NEW = '      ], core("The timeline marks them.")),\n'
WILL_2_OLD = 'core("The outline shows it, and the timeline will lane scenes by it.")),\n'
WILL_2_NEW = 'core("The outline shows it, and the timeline lanes scenes by it.")),\n'
WILL_3_OLD = 'core("The timeline will place the scene by it.")),\n'
WILL_3_NEW = 'core("The timeline places the scene by it.")),\n'

HELP_SEED_OLD = '  "seed":      number,                            // the seed version it follows; currently 4\n'
HELP_SEED_NEW = '  "seed":      number,                            // the seed version it follows; currently 5\n'
HELP_STORY_OLD = "\\`threads\\` entry-ref multi [core], Plot Thread entries · \\`notes\\` textarea. Premise panel:"
HELP_STORY_NEW = "\\`threads\\` entry-ref multi [core], Plot Thread entries · \\`brainstorm\\` entry-ref multi, stemmas · \\`notes\\` textarea. Premise panel:"
HELP_TAB_OLD = "The Story tab is the story's own record: Status, Form, Audience, Target Length, Structure (with Custom Slots when the structure is Custom), Threads, and Notes, then four panels that fold under their headings, **Premise**"
HELP_TAB_NEW = "The Story tab is the story's own record: Status, Form, Audience, Target Length, Structure (with Custom Slots when the structure is Custom), Threads, Brainstorm (the stemmas behind the story; a chip opens one), and Notes, then four panels that fold under their headings, **Premise**"

SITE_SEED_OLD = '  "seed":      number,                            // the seed version it follows; currently 4\n'
SITE_SEED_NEW = '  "seed":      number,                            // the seed version it follows; currently 5\n'
SITE_SEED2_OLD = "every field of every kind as seed 4 has them,"
SITE_SEED2_NEW = "every field of every kind as seed 5 has them,"
TD = 'style="padding:.35em .8em;border-bottom:1px solid var(--border)"'
TDM = 'style="padding:.35em .8em;border-bottom:1px solid var(--border);font-family:monospace"'
SITE_ROW_OLD = f'        <tr><td {TDM}>threads</td><td {TD}>Threads</td><td {TD}><code>entry-ref</code> multi</td><td {TD}>targets Plot Thread</td><td {TD}>core</td></tr>\n        <tr><td {TDM}>notes</td><td {TD}>Notes</td><td {TD}><code>textarea</code></td><td {TD}></td><td {TD}></td></tr>\n        <tr><td colspan="5" style="padding:.5em .8em .2em;color:var(--accent);font-size:.8rem;letter-spacing:.08em;text-transform:uppercase">The Premise panel</td></tr>\n'
SITE_ROW_NEW = f'        <tr><td {TDM}>threads</td><td {TD}>Threads</td><td {TD}><code>entry-ref</code> multi</td><td {TD}>targets Plot Thread</td><td {TD}>core</td></tr>\n        <tr><td {TDM}>brainstorm</td><td {TD}>Brainstorm</td><td {TD}><code>entry-ref</code> multi</td><td {TD}>targets Stemma</td><td {TD}></td></tr>\n        <tr><td {TDM}>notes</td><td {TD}>Notes</td><td {TD}><code>textarea</code></td><td {TD}></td><td {TD}></td></tr>\n        <tr><td colspan="5" style="padding:.5em .8em .2em;color:var(--accent);font-size:.8rem;letter-spacing:.08em;text-transform:uppercase">The Premise panel</td></tr>\n'
SITE_TAB_OLD = "<p>The Story tab is the story's own record: Status, Form, Audience, Target Length, Structure (with Custom Slots when the structure is Custom), Threads, and Notes, then four panels that fold under their headings."
SITE_TAB_NEW = "<p>The Story tab is the story's own record: Status, Form, Audience, Target Length, Structure (with Custom Slots when the structure is Custom), Threads, Brainstorm (the stemmas behind the story; a chip opens one), and Notes, then four panels that fold under their headings."


def main():
    edit(MODULES / "28_fabula" / "00_seed.jsx", [
        (SEED_OLD, SEED_NEW), (STORY_OLD, STORY_NEW),
        (WILL_1_OLD, WILL_1_NEW), (WILL_2_OLD, WILL_2_NEW), (WILL_3_OLD, WILL_3_NEW),
    ])
    seed = (MODULES / "28_fabula" / "00_seed.jsx").read_text(encoding="utf-8")
    import re
    assert not re.search(r'core\("[^"]*\bwill\b', seed), "a 'will' survived in a core line"
    edit(MODULES / "26_home-data.jsx", [(HELP_SEED_OLD, HELP_SEED_NEW), (HELP_STORY_OLD, HELP_STORY_NEW), (HELP_TAB_OLD, HELP_TAB_NEW)])
    edit(ROOT / "site" / "helloworld.html", [(SITE_SEED_OLD, SITE_SEED_NEW), (SITE_SEED2_OLD, SITE_SEED2_NEW), (SITE_ROW_OLD, SITE_ROW_NEW), (SITE_TAB_OLD, SITE_TAB_NEW)])
    print("r028 applied: the Story has Brainstorm, the seed is 5, the three lines say what the timeline does; the help and the site follow")


if __name__ == "__main__":
    main()
