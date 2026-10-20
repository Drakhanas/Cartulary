# Game Mechanics Pack — Design Reference

**Status date:** 2026-06-09 · current build r087 · Phase 1 (template design) in progress
**Supersession note:** this document reflects the edition-model revision of 2026-06-09 (decision "b"). Where it disagrees with handoff.md's 2026-06-08 snapshot (Both-as-select-option, union gates), this document is newer and wins. handoff.md should be updated at next doc batch.

---

## 1. Identity & Scope

The Game Mechanics pack is the third flagship Cartulary pack (after the Packs framework itself and Space Opera) and the fourth item in the locked v1.5 build order: Ephemeris ✓ → Packs framework ✓ → Space Opera ✓ → **Game Mechanics** → registry QA pass → ConLang core view → Ephemeris BA rows → cartulary.world.

It is the designated **comprehensive-standalone exception** to normal pack doctrine: no roster-size cap, overlap with built-ins irrelevant, every SRD entity that warrants a template gets one. Rationale: D&D matters to too many potential users to ship a thin slice.

**Major scope decision (2026-06-08, locked):** the pack ships the **full SRD as seed entries, both editions** — not templates-only. The two flagship packs together demo Cartulary fully; this one demos it with real content. This is a packs-doctrine exception; the general rule for all other packs remains templates-only. Estimated seed volume: **~1,000–1,200 entries**.

Consequence: the pack format must gain an `entries` array and a seeding import path (ID-namespacing, ref-wiring, idempotent re-import, no-clobber — r082 care level). That is Phase 2 of the build plan.

**Sources:** SRD 5.1 (403pp) and SRD 5.2.1 (364pp), both CC-BY-4.0, both in project files at `/mnt/project/SRD_CC_v5_1.pdf` and `/mnt/project/SRD_CC_v5_2_1.pdf`. Note: the project-mount copies are extracted text under `.pdf` filenames (the ingestion layer extracts; `pdftotext` will fail on them, plain text reads work). Extraction artifacts present: non-breaking spaces (`\xc2\xa0`), `\t\r` runs, soft-hyphen `\u0002` marks. The Phase 3 pipeline consumes this text directly.

---

## 2. Licensing & Attribution

Both attribution statements are license-mandated verbatim strings. They go on the pack envelope exactly as written, both present, labeled, never normalized into one (wording and URLs differ between editions).

**SRD 5.1:**

> This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

**SRD 5.2.1:**

> This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

License constraints that ride along:
- Do **not** add any other Wizards attribution beyond the statements above.
- A "compatible with fifth edition" / "5E compatible" line is explicitly permitted but optional.
- Pack envelope is `{id, name, description, templateIds}`; both statements concatenate into `description` unless the Phase 2 entries-capable envelope grows a dedicated attribution field.

---

## 3. Edition Model

This is the architecture that changed on 2026-06-09. Read this section as authoritative.

### 3.1 The two-field model (decision "b")

- **Edition** — select, options **{2014, 2024}** only. Every template carries it. No "Both" option anywhere.
- **Applies to Both Editions** — select, options No/Yes (No default), present **only on templates with shareable SRD content** (see §3.4). Yes marks an entry as valid in both editions. Seeder-set in practice; user-editable in principle (soft footgun only — see §3.5).

The earlier model (Edition = 2014/2024/Both with `{2014, Both}` / `{2024, Both}` showWhen unions) is dead. Under "b", every edition gate is a plain `{2014}` or `{2024}` list. The Edition field always holds one real edition, so field gating stays single-edition and dumb.

### 3.2 Split-on-divergence rule

Any entity that differs between editions in any way becomes **two entries**: a 2014 entry and a 2024 entry, flag No on both. The flag lands only on entities that are genuinely identical across editions. Both never means "merged" — a flagged entry stores exactly one edition's values, and that's the whole story because the content is the same.

### 3.3 The variant filter (shipped, r087)

Core feature, not pack code. The pack consumes it.

- `state.world.variantAxis = null | { fieldLabel, flagLabel, active }`, world-level, migrate-backfilled to null (dormant) on all pre-r087 worlds.
- Configured on the Settings view: axis field label + optional all-variants flag label, matched case/whitespace-insensitively against **select** fields across all templates (a text field with the same label does not count).
- When configured, a picker appears in the entry-list controls: "All" + the union of axis option values (first-seen order across templates).
- Filter rule with an active variant picked: an entry is hidden only when its template has the axis field, the entry has a value in it, the value differs from active, AND the flag field (if the template has one) isn't "Yes". Everything else passes.
- **Forgiving fallbacks:** templates without the axis field are unaffected; entries with Edition unset always show (this is the homebrew escape hatch on flagless templates).
- **Scope: entry list only.** Specialty views (Concordance, Linea, Chronometric, Stemma, Cartographia, Kalendarium, Ephemeris, family tree), exports, and the entry-ref picker are never filtered. Ref-picker unfiltered is deliberate: cross-edition refs are legitimate (a flagged spell ref'd from a 2014 class).
- `active` persists on world state: a 2024 campaign stays a 2024 campaign across reloads.
- Stale active values (axis options changed under it) are injected into the picker rather than blanked, so the select never misrepresents state.
- Isolation-tested (17 cases: view matrix, flag rescue, object-shaped select values, unset values, unmapped templates, flagless config, stale active, full migrate coercion table). Browser verification by Drak pending.

**Phase 2 obligation:** the seeding import writes the config on pack install (`fieldLabel: "Edition"`, `flagLabel: "Applies to Both Editions"`) so Game Mechanics users never touch Settings.

**Deferred (roadmap):** the v2 generalization — variant as an entry-level attribute, world-scoped config infrastructure, filtering across all specialty views, showWhen reading the variant, export edition-awareness. Estimated ~14–22 r-bumps; the swing factor is per-view relational behavior (edges pointing at filtered-out entries must surface diagnostically, never silently drop). Not a Game Mechanics dependency.

### 3.4 Flag placement (PROPOSED, awaiting Drak)

Flag on: **Spell, Armor, Gear, Item, Magic Item.**
No flag: **Weapon** (2024 gave every weapon a Mastery property, so every SRD weapon diverges), **Stat Block** (2024 rebuilt every monster's structure — Initiative line etc.), **Class** (wholesale 2024 rewrites), **Species/Race** (100% divergent, verified — see §8).
Remaining 7 templates: decided at design time, default no-flag unless that content class has verified identical-across-edition entities (Affliction is the only plausible candidate; verify against source when designed).

Side effect of this lean placement: Stat Block, Weapon, and Class get no field-count change from the "b" propagation, so their locked pairing stands. Only the five flag-bearing templates change counts, and Edition + flag = two new halves = original even parity restored on all five.

### 3.5 Failure modes, ranked

- Old model's hard footgun (a Both entry rendering both editions' field sets stacked, inviting Frankenstein data entry) is **eliminated**: there is no Both value to select and no union gates.
- Remaining soft footgun: a user flags divergent homebrew. Result: the entry shows in both views carrying its one edition's values — incomplete in the other view, not incoherent. Acceptable.
- Seeding-correctness check (Phase 3/4): the extractor must never flag a divergent entity. Diff 5.1 vs 5.2.1 per entity; any difference = split.

---

## 4. Template Roster & Status

15 templates, roster locked. Equipment cluster boundary locked (option a): magic weapons and armor live in Weapon/Armor behind a gated magical cluster; Magic Item holds only wand/ring/potion/rod/staff/wondrous/scroll.

```
#   Template          Status                                   Flag
01  Stat Block        LOCKED + proposed "b" delta              no
02  Weapon            LOCKED + proposed "b" delta              no
03  Armor             LOCKED + proposed "b" revision           yes (proposed)
04  Gear              LOCKED + proposed "b" revision           yes (proposed)
05  Item              LOCKED + proposed "b" revision           yes (proposed)
06  Magic Item        LOCKED + proposed "b" revision           yes (proposed)
07  Spell             LOCKED + proposed "b" revision           yes (proposed)
08  Class             LOCKED + proposed "b" delta              no
09  Species/Race      PROPOSED in full (subrace question open) no (settled)
10  Background        not designed                             TBD
11  Feat              not designed                             TBD
12  Encounter         not designed                             TBD (non-SRD utility)
13  Trap/Hazard       not designed                             TBD
14  Affliction        not designed                             TBD (plausible yes)
15  Player Character  not designed                             no (single-edition by nature)
```

Excluded from the roster (decided, with reasons): standalone Condition (fixed glossary), Plane/Deity (removed from 5.2.1 / covered by narrative built-ins), Habitat/Treasure tags (not in any SRD — Monster Manual flavor).

**Realization timing:** every schema below is TARGET state. Nothing is built. All of it lands at generator-authoring time (Phase 1 output feeding Phase 2). The Game Mechanics pack needs its own generator following the `build_pack.py` pattern (self-validating Python, single-file JSON, name-based refs, explicit field ids); the existing generator is Space-Opera-specific.

---

## 5. Schemas

Conventions: "OTF" = otherTextField. All longform fields are full-width. Pairing notes use the live type-based rule: hidden fields are removed before pairing, orphaned partners re-pair forward, an odd visible half count auto-expands the last lone half to full width. The legacy `halfWidth` flag is inert.

### 5.1 LOCKED, awaiting "b" propagation sign-off

#### Stat Block (45 fields)

Proposed delta only: Edition options drop Both; Initiative and Gear gates `{2024, Both}` → `{2024}`; any `{2014, Both}` gate → `{2014}`. No flag. Pairing unchanged (2014 state orphans Condition Immunities to full-width — accepted).

```
Other Names                 text             half-eligible
Edition                     select           half-eligible · 2014/2024 · gates Initiative, Gear
STR Score                   select           half-eligible · 1-30 closed
STR Mod                     select           half-eligible · cascade <- STR Score, one option per score
DEX Score / DEX Mod         (same pattern)
CON Score / CON Mod         (same pattern)
INT Score / INT Mod         (same pattern)
WIS Score / WIS Mod         (same pattern)
CHA Score / CHA Mod         (same pattern)
STR Save                    select           half-eligible · -5..+20 signed, manual
DEX/CON/INT/WIS/CHA Save    (same pattern, listed after the score/mod block)
Challenge Rating            select           half-eligible · 0, 1/8, 1/4, 1/2, 1-30 closed
Size                        select           half-eligible · Tiny..Gargantuan closed
Creature Type               select OTF       half-eligible · Other +
Alignment                   select OTF       half-eligible · Other +
Armor Class                 number           half-eligible
Initiative                  text             half-eligible · sW Edition=2024
Hit Points                  number           half-eligible
Hit Dice                    text             half-eligible
Speed                       text             half-eligible
Senses                      text             half-eligible
Skills                      text             half-eligible
Languages                   text             half-eligible
Damage Vulnerabilities      text             half-eligible
Damage Resistances          text             half-eligible
Damage Immunities           text             half-eligible · 2024 displays merged w/ condition
Condition Immunities        text             half-eligible
Gear                        entry-ref multi  full · ->Weapon/Armor/Gear/Item/Magic Item · sW Edition=2024
Traits                      longform         full
Actions                     longform         full
Bonus Actions               longform         full
Reactions                   longform         full
Legendary Actions           longform         full
Lair Actions & Regional Eff longform         full
Description                 longform         full
Notes                       longform         full
```

Score → Mod mapping (the cascade child carries exactly one option per parent score value, encoding floor((score−10)/2)):
1:−5 · 2–3:−4 · 4–5:−3 · 6–7:−2 · 8–9:−1 · 10–11:+0 · 12–13:+1 · 14–15:+2 · 16–17:+3 · 18–19:+4 · 20–21:+5 · 22–23:+6 · 24–25:+7 · 26–27:+8 · 28–29:+9 · 30:+10

This cascade is Drak's design; it replaced an over-engineered computed-field engine idea. Save fields are deliberately manual (monster saves include proficiency and are not derivable from the mod).

#### Weapon (20 fields)

Proposed delta only: Edition options drop Both; Mastery Property gate `{2024, Both}` → `{2024}`. No flag. Pairing unchanged.

```
Other Names                 text             half-eligible
Edition                     select           half-eligible · 2014/2024 · gates Mastery Property
Weapon Category             select           half-eligible · Simple/Martial
Weapon Type                 select           half-eligible · Melee/Ranged
Cost                        text             half-eligible
Weight                      text             half-eligible
Damage                      text             half-eligible
Damage Type                 select OTF       half-eligible · Other + · Bludgeoning/Piercing/Slashing
Properties                  text             half-eligible
Range                       text             half-eligible
Current Owner               entry-ref        half-eligible · single ->Character
Magical?                    select           half-eligible · No/Yes · gates cluster
Rarity                      select           half-eligible · Common..Artifact · sW Magical=Yes
Attunement                  text             half-eligible · sW Magical=Yes
Magic Bonus                 select           half-eligible · +1/+2/+3 · sW Magical=Yes
Charges                     number           half-eligible · sW Magical=Yes
Mastery Property            select           half-eligible · Cleave/Graze/Nick/Push/Sap/Slow/Topple/Vex · sW Edition=2024
Magic Properties            longform         full · sW Magical=Yes
Description                 longform         full
Notes                       longform         full
```

#### Class (17 fields)

Proposed delta only: Edition options drop Both. Label-only, no gates off it. No flag. Pairing unchanged.

```
Other Names                 text             half-eligible
Edition                     select           half-eligible · 2014/2024 · label-only
Class Type                  select           half-eligible · Base/Subclass · the real gate
Parent Class                entry-ref        half-eligible · single ->Class self · refFilters Class Type=Base · sW Class Type=Subclass
Hit Die                     select           half-eligible · d6/d8/d10/d12 · sW Base
Primary Ability             select OTF       half-eligible · Other + · sW Base
Spellcasting Ability        select OTF       half-eligible · Other + · None/Int/Wis/Cha · sW Base
Subclass Level              select           half-eligible · 1/2/3 · sW Base · 2024=3
Saving Throw Proficiencies  text             half-eligible · sW Base
Armor Proficiencies         text             half-eligible · sW Base
Weapon Proficiencies        text             half-eligible · sW Base
Tool Proficiencies          text             half-eligible · sW Base
Skill Proficiencies         text             half-eligible · sW Base
Features by Level           longform         full · divider per tier
Starting Equipment          textarea         full · sW Base
Description                 longform         full
Notes                       longform         full
```

Model clarification (settled): Class is a **documentation template**. Each class and each subclass is its own entry; a subclass refs its parent via refFilters on Class Type=Base. It is NOT a baked class→subclass cascade dropdown. The pick-class-then-subclass UX belongs to the Player Character sheet, where it is an open decision (§9).

### 5.2 PROPOSED "b" revisions (full corrected schemas, awaiting sign-off)

These five gained Edition this session (re-add locked), then gained the flag under the "b" propagation (proposed). Flag spec everywhere: `Applies to Both Editions`, select, No/Yes, No default, no OTF, position 3 directly after Edition.

#### Armor (19 fields)

```
Other Names                 text             half-eligible
Edition                     select           half-eligible · 2014/2024
Applies to Both Editions    select           half-eligible · No/Yes · NEW
Armor Category              select           half-eligible · Light/Medium/Heavy/Shield
Cost                        text             half-eligible
Weight                      text             half-eligible
Base AC                     text             half-eligible
Strength Requirement        text             half-eligible
Stealth                     select           half-eligible · Normal/Disadvantage
Don/Doff Time               text             half-eligible
Current Owner               entry-ref        half-eligible · single ->Character
Magical?                    select           half-eligible · No/Yes gate
Rarity                      select           half-eligible · sW Magical=Yes
Attunement                  text             half-eligible · sW Magical=Yes
Magic Bonus                 select           half-eligible · sW Magical=Yes
Charges                     number           half-eligible · sW Magical=Yes
Magic Properties            longform         full · sW Magical=Yes
Description                 longform         full
Notes                       longform         full
PAIRING  empty/Magical=No: 12 halves clean · Magical=Yes: 16 clean
```

#### Gear (10 fields)

```
Other Names                 text             half-eligible
Edition                     select           half-eligible · 2014/2024
Applies to Both Editions    select           half-eligible · No/Yes · NEW
Gear Category               select OTF       half-eligible · Other + · Adventuring Gear/Tool/Equipment Pack/Ammunition
Cost                        text             half-eligible
Weight                      text             half-eligible
Associated Ability          select           half-eligible · Str..Cha · sW Category=Tool
Contents                    longform         full · sW Category=Equipment Pack
Description                 longform         full
Notes                       longform         full
PAIRING  non-Tool: 6 halves clean · Tool: 7 -> Associated Ability expands (cosmetic)
```

#### Item (12 fields)

```
Other Names                 text             half-eligible
Edition                     select           half-eligible · 2014/2024
Applies to Both Editions    select           half-eligible · No/Yes · NEW
Current Owner               entry-ref        half-eligible · single ->Character
Item Category               select OTF       half-eligible · Other + · Trade Good/Valuable/Mount/Vehicle/Food & Drink/Lodging/Service
Cost/Value                  text             half-eligible
Weight                      text             half-eligible
Quantity/Unit               text             half-eligible
Speed                       text             half-eligible · sW Category in {Mount,Vehicle}
Carrying Capacity           text             half-eligible · sW Category in {Mount,Vehicle}
Description                 longform         full
Notes                       longform         full
PAIRING  most: 8 halves clean · Mount/Vehicle: 10 clean
NOTE     showWhen aligned to value "Mount", not "Mount or Animal"
```

#### Magic Item (15 fields)

```
Other Names                 text             half-eligible
Edition                     select           half-eligible · 2014/2024
Applies to Both Editions    select           half-eligible · No/Yes · NEW
Current Owner               entry-ref        half-eligible · single ->Character
Item Type                   select OTF       half-eligible · Other + · Potion/Scroll/Wand/Rod/Staff/Ring/Wondrous Item
Item Set                    select           half-eligible · No/Yes · gates Set Bonuses
Rarity                      select           half-eligible · Common..Artifact (six tiers)
Attunement                  text             half-eligible
Magic Bonus                 select           half-eligible · +1/+2/+3 optional
Charges                     number           half-eligible · optional
Associated Spells           entry-ref multi  full · ->Spell · sW Item Type in {Scroll,Wand,Staff,Rod}
Item Set Bonuses            textarea         full · sW Item Set=Yes
Properties/Effects          longform         full
Description                 longform         full
Notes                       longform         full
PAIRING  always: 10 halves clean
```

#### Spell (16 fields)

```
Other Names                 text             half-eligible
Edition                     select           half-eligible · 2014/2024 · label-only
Applies to Both Editions    select           half-eligible · No/Yes · NEW · the workhorse: most spells identical
Level                       select           half-eligible · Cantrip, 1-9 closed
School                      select           half-eligible · Abjuration..Transmutation closed
Casting Time                select OTF       half-eligible · Other + · Action/Bonus Action/Reaction/1 min/10 min/1 hr
Range                       text             half-eligible
Components                  text             half-eligible
Save/Attack                 select OTF       half-eligible · Other + · None/Spell Attack/Str..Cha save
Duration                    text             half-eligible
Concentration               select           half-eligible · No/Yes
Ritual                      select           half-eligible · No/Yes · confirmed in BOTH editions, ungated
Classes                     entry-ref multi  full · ->Class
At Higher Levels            textarea         full
Description                 longform         full
Notes                       longform         full
PAIRING  always: 12 halves clean
```

### 5.3 PROPOSED in full: Species/Race (14 fields, two open questions)

Verified against both SRDs (§8). The edition split is structural, so Edition is a real gate here.

```
Other Names                 text             half-eligible
Edition                     select           half-eligible · 2014/2024 · primary gate
Race Type                   select           half-eligible · Base Race/Subrace · gate (see open Q)
Parent Race                 entry-ref        half-eligible · single ->this tmpl · refFilters Race Type=Base · sW Race Type=Subrace
Creature Type               select OTF       half-eligible · Other + · Humanoid typical · sW Edition=2024
Size                        select OTF       half-eligible · Other + · Small/Medium/Small or Medium
Speed                       text             half-eligible · "30 feet"; dwarf carries heavy-armor caveat (2014)
Ability Score Increase      text             half-eligible · sW Edition=2014
Age                         text             half-eligible · sW Edition=2014
Suggested Alignment         text             half-eligible · sW Edition=2014
Languages                   text             half-eligible · sW Edition=2014
Traits                      textarea         full · markdown + wiki-links (Darkvision, lineages, resistances)
Description                 longform         full · flavor/lore
Notes                       longform         full
```

Field-type reasoning on record: Traits is textarea, not longform, because trait blocks want markdown (bold trait names) and wiki-links (to conditions/spells), which longform deliberately skips. ASI/Speed/Age stay text because SRD phrasings carry caveats a number field would mangle. No flag field (100% divergence — nothing to flag).

**Open question 1 — subrace modeling (blocks lock):**
- Option A (as drawn): Race Type gate + Parent Race ref, Class-parity. Subraces (Hill Dwarf, High Elf, ~5–6 in 5.1) become first-class queryable entries. 2024 has no subraces, so this is 2014-only machinery.
- Option B: drop both fields, fold subraces into Traits prose. Two fewer fields, subraces stop being first-class.

**Open question 2 — pairing depends on Q1.** As drawn (option A): 2014 Base 9 halves → Languages orphans; 2024 Base 6 clean; 2014 Subrace 10 clean; 2024 Subrace (rare) 7 → Speed orphans. Re-trace if option B.

### 5.4 Not yet designed (6 templates, design notes on record)

- **Background** — 2014 feature vs 2024 ASI + Origin feat; Edition-gated.
- **Feat** — 5.1 contains Grappler only; 2024 has categories Origin/General/Fighting Style/Epic Boon; Edition-gated.
- **Encounter** — non-SRD utility template; party level / XP budget / refs to Stat Blocks + Location. SRD encounter-building math is thin (verified); keep modest.
- **Trap/Hazard** — both editions; trigger / effect / DC / damage.
- **Affliction** — poison/disease/curse; disease + madness content is 5.1-mostly, so those slices gate `{2014}`; the one plausible flag candidate, verify identical entities against source at design time.
- **Player Character** — integrative sheet; class + subclass refs; ability scores feed the mod cascade off the FINAL post-ASI total, not base. Carries the class-picker UX decision (§9).

---

## 6. Settled Mechanics & Conventions

- **Score/Mod cascade** (§5.1) — Drak's solution; no computed-field engine feature.
- **Edition on every template** — 2014/2024, gating where editions diverge structurally (Species/Race, Background, Feat, Affliction slices, Stat Block Initiative/Gear, Weapon Mastery), label-only where divergence lives in free text (Class, Spell).
- **Tags are user-only.** System metadata uses fields, never the tag array.
- **Magical cluster** (shared by Weapon, Armor): Magical? No/Yes gate → Rarity, Attunement, Magic Bonus, Charges, Magic Properties.
- **Status/Type fields get Other + OTF** per template-engine doctrine, except deliberately closed lists (ability scores, CR, Size, Level, School, Hit Die, edition/flag binaries, Mastery, Damage Type core three... note Damage Type carries OTF, the closed ones are listed as closed in their schema lines).
- **Field-order pattern** holds: identity → anchors → quantitative → refs → behavioral → temporal → Notes. Edition sits at position 2, flag at position 3 where present.
- **Nothing destroyed**: field removals and data-loss edges append to Notes (template-engine doctrine, applies to any future schema migration of these templates).
- **Longform vs textarea** convention (r086): longform for big prose blocks (Description, Notes, Features by Level, action blocks); textarea where markdown/wiki-link/ref support matters (Traits, At Higher Levels, Item Set Bonuses, Starting Equipment).

---

## 7. SRD-Verified Facts (source-checked, supersede search-era assumptions)

- Encounter-building math is thin in the SRDs.
- Bastions are NOT in 5.2.1.
- Habitat/Treasure tags are NOT in any SRD (Monster Manual flavor).
- Ritual casting IS in 5.1 (Spell's Ritual field is ungated).
- Weapon Mastery is 2024-only.
- Magic item rarity has six tiers (Common..Artifact).
- 5.1 races (9): Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling. Parts: ASI, Age, Alignment, Size, Speed, named traits, Languages, subraces.
- 5.2.1 species (9): Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling. Parts (explicit in source): Creature Type, Size, Speed, Special Traits. No ASI (moved to background), no Age/Alignment/Languages, no subraces (replaced by in-trait lineage choices).
- Union deltas: Goliath + Orc are 2024-only; Half-Elf + Half-Orc are 2014-only (no 2024 counterpart, seeded as 2014 singletons). **Aasimar is in neither SRD.**
- Race divergence is total. Structural: the field-set mismatch above hits every race. Per-trait, even where structure-agnostic: Dwarf speed 25→30, Darkvision 60→120, Stonecunning rewritten (History-check bonus → Bonus Action Tremorsense), Dwarven Toughness promoted from Hill Dwarf subrace to base, Combat Training + Tool Proficiency dropped; Elf Keen Senses fixed-Perception → choice of three, subraces → Elven Lineage spell progression, Fey Ancestry rephrased with sleep immunity relocated to Trance. Zero flag-eligible races.

---

## 8. Build Plan (4 phases, est. ~12–18 sessions, dominated by Phase 3)

1. **Templates** (~1–2 sessions). Sign off "b" propagation; lock Species/Race (subrace decision); design + lock Background, Feat, Encounter, Trap/Hazard, Affliction, Player Character with per-template flag decisions. Output: 15 target schemas.
2. **Entries-in-packs engine + generator** (~1–2). Pack format gains `entries` array; import path seeds entries with ID-namespacing, ref-wiring, idempotent re-import, no-clobber (r082 care level). Writes the variantAxis config on install. r-bump on the HTML; new self-validating Python generator for this pack (build_pack.py pattern, not the Space Opera generator itself).
3. **Extraction** (~7–12, the long pole). Per-content-type extractors from both SRD texts → structured entries, run as a data pipeline: scripts emit JSON, validate counts/schema/refs/spot-checks in aggregate; never hold all SRD text or all entries in context. Per-entity 5.1 vs 5.2.1 diff drives split-vs-flag. Parse accuracy is the main risk.
4. **QA** (~1–2). Real-world import/export of the full pack (not synthetic): render/ref/cascade checks plus automated schema conformance. Includes the flag-correctness audit (no divergent entity flagged).

Current position: mid-Phase 1. Done: roster, 8 locks, 5 Edition re-adds, attribution capture, edition-model revision, r087 variant filter. Awaiting: "b" sign-off, then Species/Race.

---

## 9. Open Decisions (Drak's calls, in rough order of arrival)

1. **"b" propagation sign-off** — the five revised schemas (§5.2) + three deltas (§5.1) + flag placement (§3.4). Last presented 2026-06-09; reorder or proceed.
2. **Species/Race subrace modeling** — Base/Subrace gate (Class-parity, first-class subraces) vs fold-into-Traits (leaner). Blocks the Species/Race lock.
3. **Canonical Edition value on flagged entries** — a flagged (identical) entry must still store 2014 or 2024 in its Edition field. Recommendation: 2024 uniformly (arbitrary by definition, but consistency helps the QA audit). Decide before Phase 3.
4. **Split-entry naming convention** — split entities produce two same-named entries ("Dwarf" ×2) visible together in the All view. Options: bare names both (rely on the filter), edition-suffixed names ("Dwarf (2014)" / "Dwarf (2024)"), suffix the 2014 entry only. Decide before Phase 3; affects wiki-link targeting and ref pickers, where same-name pairs are ambiguous.
5. **Per-template flag decisions on the remaining 6** — at design time, default no.
6. **Player Character class-picker UX** — entry-ref vs something richer. Constraint on record: refFilters cannot do dynamic cross-entry filtering (subclasses-of-the-chosen-class); confirm engine capability before promising that UX. Deferred to the PC template design.
7. **Pack envelope attribution placement** — concatenated into `description` vs a dedicated envelope field added in Phase 2. Low stakes; default is description.

---

## 10. Risks

- **Phase 3 parse accuracy** — the dominant risk. ~1,000–1,200 entries extracted from artifact-laden text; mitigation is the pipeline discipline (per-section parsers, aggregate validation, spot-checks) plus QA Phase 4.
- **Flag misassignment** — a divergent entity flagged produces a wrong-in-one-view entry (soft failure under "b", but still wrong). Mitigation: extractor diffs per entity; QA audit.
- **Entries-engine no-clobber** — seeding into a world with existing user content must never overwrite; idempotent re-import must not duplicate. The r082 round-trip double-namespacing bug is the cautionary precedent.
- **Same-name ambiguity** (open decision 4) — unresolved, it degrades wiki-links and ref pickers for every split entity.
- **Scope weight** — the full-SRD-seed decision turned a templates pack into a 12–18 session pipeline project. It was made deliberately (flagship demo argument) and nothing is built against it yet, so it remains reversible to templates-first/seed-later if the grind warrants. On record as of 2026-06-09.

---

## 11. Durable References

- SRD texts: `/mnt/project/SRD_CC_v5_1.pdf`, `/mnt/project/SRD_CC_v5_2_1.pdf` (extracted text under .pdf names; read as plain text).
- Working HTML: r087 staged as `Cartulary_v1_5_Working_r087_variant-filter.html`. Parse gate: `/tmp/babelcheck/check.js` (rebuild from project files on fresh containers; reads `/home/claude/cartulary.html`).
- Generator pattern: `build_pack.py` (project files) — self-validating, single-file JSON, envelope `cartulary_pack_export:1`, name-based refs, explicit field ids. The `_half_ungated` tally-leak fix (validator must tally into a separate dict, never mutate template objects) carries forward into the Game Mechanics generator.
- Pack import code-watch: `handleImportPackFile` must run `resolveTemplateRefs` (gates/cascades/refFilters silently fail without it).
- Variant filter touch points (r087): migrate() variantAxis block, variantAxisInfo memo + filter clause in filteredEntries, EntryList picker, SettingsView "Variant Filter" section.
- Half-width pairing: type-based (text/number/date/calendar-date/color/url/tags/select/single entry-ref), visibility-filtered before pairing, lone half auto-expands. Authored halfWidth flag is inert.
- Edition model history: original (Both-as-option, union gates) designed 2026-06-08, recorded in handoff.md §2/§5; superseded 2026-06-09 by decision "b" (this doc §3). handoff/changelog/roadmap/doctrine deltas pending the next doc batch.
