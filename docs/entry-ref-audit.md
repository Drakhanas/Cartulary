# Entry-ref audit: the built-in templates

Read 2026-10-23 against the v1.6 tree (r051). The question: does each reference field in the 20 built-in templates point at the right templates? Each flag below is Drak's call, and each one taken becomes part of a v1.7 cut.

## The mechanical half

107 entry-ref fields name 149 targets, 19 distinct: 17 of the templates, plus Astronomical Body and ConLang, the two non-entry targets. Every target resolves, so nothing dangles. Three templates are never a target: Theme / Motif, Vehicle, and Weapon / Armor.

## Found while auditing: a data-loss bug in v1.5 and v1.6

`migrate()` runs on every load, every JSON import, and every snapshot restore, and near its end it cleans entry-ref values for every field that has a list of allowed targets. A value survives only if it's the id of an entry in `state.entries`. Astronomical bodies and Glossopoeia records aren't entries, so a reference to one is dropped without a word.

Two built-in fields offer a body as a target: Location › Parent and Historical Event › Location. Any multi-template field a user builds that includes Astronomical Body or a Glossopoeia source (ConLang, Lexeme, Phoneme, Grammatical Value, Affix, Word-Building Process, Inflection Class, Writing System) is affected the same way. Single-target fields skip the cleanup, so the built-in Languages Spoken fields, which target ConLang alone, keep their values.

Shown in the shipped finals, headless:

- **v1.6** (`Cartulary_v1.6.html`, `b99381a041153d9d`): a world saved to IndexedDB with a Location whose Parent is a planet loads with that Parent empty, and the app saves the emptied value back. A Historical Event whose Location is a planet and a city keeps only the city. A user-built field that lists ConLang among its targets loses its language references, though the language itself survives. The built-in Character › Languages Spoken, a single-target field, keeps the same reference.
- **v1.5** (`Cartulary_v1.5.html`, `c3a62e07e09b0194`): the same result for the same Parent and Location, so the bug shipped in both releases.

The fix is a cut: the cleanup has to accept an id that resolves to a registered record whose source is among the field's targets. It should land before any change below that adds a non-entry target to a field.

## Flags, strongest first

1. **Weapons and vehicles can't be possessed.** Character › Possessions, House › Heirlooms, and Theme / Motif › Associated Objects target only Artifact / Object / Currency. A sword's entry can name its wielder, but the wielder's entry can't list the sword, and a ship can't appear among anyone's possessions. Proposed: Possessions and Associated Objects add Weapon / Armor and Vehicle; Heirlooms adds Weapon / Armor.
2. **Ownership is one template wide in three places.** Artifact › Current Owner takes only Character. Vehicle › Owner / Faction takes only Faction, though its label offers an owner. Weapon / Armor › Previous Owners takes only Character. Book's owner fields already take Character, Faction, and Culture. Proposed: Artifact Current Owner and Vehicle Owner / Faction take Character, Faction, and House; Weapon Previous Owners matches.
3. **A character's allies and enemies can only be other characters.** Character › Ally / Mentor and Enemies take only Character, while Faction's allies and enemies take Character, Faction, Culture, and Deity, and Deity's allied and opposing powers take Character, Faction, and Deity. A patron god or a sworn-enemy order can't be named from the character's side. Proposed: both take the same four.
4. **Where a substance comes from, and what drives a vehicle.** Substance / Material › Source / Where Found takes only Location, so a substance harvested from a creature has no source. Vehicle › Power Source takes only Magic / Tech System, so a fuel kept as a Substance entry can't be named. Proposed: Source / Where Found adds Creature (and Astronomical Body, but only after the bug above is fixed); Power Source adds Substance / Material.
5. **A religion founded by a god.** Religion › Founder takes only Character, while Book › Author already accepts Deity. Proposed: add Deity. House › Founder stays Character.
6. **Single where the set is plural.** Artifact › Material is single while Weapon / Armor › Materials is multi. Character › Species / Race is single, which rules out mixed heritage unless the mix is its own Race entry. Proposed: Artifact Material becomes multi; Species / Race is Drak's call. Changing single to multi rewrites stored values (an id becomes a list), so it's a value migration, not a target-list edit.
7. **Containment that skips planes.** Location › Parent takes Location and Astronomical Body but not Cosmology / Plane, while Historical Event › Location takes all three. Character › Current Whereabouts and Race › Native Habitat take only Location. Low priority, since a site on a plane can be a Location entry. Proposed: Location Parent adds Cosmology / Plane; the other two stay.
8. **Rulers.** Faction › Leadership doesn't take House, Cosmology › Ruling Powers takes only Deity, and Location › Government / Authority takes only Faction. Low priority. Proposed: Faction Leadership adds House; the other two stay.

Read and left alone: Deity › Pantheon targets Religion, which looks odd beside its label but is the inverse of Religion › Worshipped Deities, and every field marked ok in the table.

## What a fix costs

Widening a target list changes no stored value. The cut edits `BUILTIN_TEMPLATES` and adds a migration that rewrites the targets of built-in-origin templates by field label, the way the Astronomical Body and ConLang renames rewrote `refTemplates`, so existing worlds get the change and user-built templates are left alone. A field that moves from one target to several also starts going through the cleanup described above, which is safe for entry targets and, until the fix, unsafe for bodies and Glossopoeia records. Nothing here proposes narrowing a list: the cleanup would silently drop every value that fell outside the new one.

## Every field

| Template | Field | Targets | Call |
|---|---|---|---|
| Artifact / Object / Currency | Material | Substance / Material | flag 6 |
| Artifact / Object / Currency | Issuing Faction | Faction / Government / Organization | ok |
| Artifact / Object / Currency | Current Owner | Character | flag 2 |
| Artifact / Object / Currency | Current Location | Location | ok |
| Artifact / Object / Currency | Enchanted / Enhanced With (multi) | Magic / Tech System | ok |
| Book / Document / Text / Tome | Author | Character, Deity / Entity, Faction / Government / Organization | ok |
| Book / Document / Text / Tome | Language | ConLang | ok |
| Book / Document / Text / Tome | Current Location | Location | ok |
| Book / Document / Text / Tome | Current Owner(s) (multi) | Character, Faction / Government / Organization, Culture / People | ok |
| Book / Document / Text / Tome | Previous Owner(s) (multi) | Character, Faction / Government / Organization, Culture / People | ok |
| Character | Species / Race | Race / Species / Ancestry | flag 6 |
| Character | Father (parent) | Character | ok |
| Character | Mother (parent) | Character | ok |
| Character | Religion | Religion / Belief System | ok |
| Character | Current Whereabouts | Location | flag 7 |
| Character | Spouse (multi) (spouse) | Character | ok |
| Character | Languages Spoken (multi) | ConLang | ok |
| Character | Practitioner / Wielder of (multi) | Magic / Tech System | ok |
| Character | Affiliations (multi) | Faction / Government / Organization | ok |
| Character | House / Kin-group (multi) | House / Dynasty / Clan / Bloodline | ok |
| Character | Ally / Mentor (multi) | Character | flag 3 |
| Character | Enemies (multi) | Character | flag 3 |
| Character | Possessions (multi) | Artifact / Object / Currency | flag 1 |
| Cosmology / Plane | Connected Planes (multi) | Cosmology / Plane | ok |
| Cosmology / Plane | Ruling Powers (multi) | Deity / Entity | flag 8 |
| Cosmology / Plane | Notable Locations (multi) | Location | ok |
| Cosmology / Plane | Resident Factions (multi) | Faction / Government / Organization | ok |
| Cosmology / Plane | Typical Inhabitants (multi) | Creature, Race / Species / Ancestry | ok |
| Creature | Innate Magic / Technology (multi) | Magic / Tech System | ok |
| Culture / People | Cultural Magic / Technology (multi) | Magic / Tech System | ok |
| Culture / People | Associated Races (multi) | Race / Species / Ancestry | ok |
| Culture / People | Associated Locations (multi) | Location | ok |
| Culture / People | Languages (multi) | ConLang | ok |
| Culture / People | Religions (multi) | Religion / Belief System | ok |
| Culture / People | Notable Members (multi) | Character | ok |
| Deity / Entity | Known Grantable Magic / Technology (multi) | Magic / Tech System | ok |
| Deity / Entity | Pantheon (multi) | Religion / Belief System | ok |
| Deity / Entity | Holy Sites (multi) | Location | ok |
| Deity / Entity | Worshippers (multi) | Faction / Government / Organization, Culture / People, Character | ok |
| Deity / Entity | Allied Powers (multi) | Deity / Entity, Faction / Government / Organization, Character | ok |
| Deity / Entity | Opposing Powers (multi) | Deity / Entity, Faction / Government / Organization, Character | ok |
| Faction / Government / Organization | Parent Organization | Faction / Government / Organization | ok |
| Faction / Government / Organization | Headquarters | Location | ok |
| Faction / Government / Organization | Known Magic / Technology Used (multi) | Magic / Tech System | ok |
| Faction / Government / Organization | Leadership (multi) | Character, Deity / Entity, Faction / Government / Organization | flag 8 |
| Faction / Government / Organization | Notable Members (multi) | Character | ok |
| Faction / Government / Organization | Allies (multi) | Faction / Government / Organization, Character, Culture / People, Deity / Entity | ok |
| Faction / Government / Organization | Enemies (multi) | Faction / Government / Organization, Character, Culture / People, Deity / Entity | ok |
| House / Dynasty / Clan / Bloodline | Founder | Character | ok |
| House / Dynasty / Clan / Bloodline | Current Head | Character | ok |
| House / Dynasty / Clan / Bloodline | Seat | Location | ok |
| House / Dynasty / Clan / Bloodline | Descended From / Cadet Of | House / Dynasty / Clan / Bloodline | ok |
| House / Dynasty / Clan / Bloodline | Culture / People | Culture / People | ok |
| House / Dynasty / Clan / Bloodline | Race / Species | Race / Species / Ancestry | ok |
| House / Dynasty / Clan / Bloodline | Cadet Branches (multi) | House / Dynasty / Clan / Bloodline | ok |
| House / Dynasty / Clan / Bloodline | Members (multi) | Character | ok |
| House / Dynasty / Clan / Bloodline | Holdings / Domains (multi) | Location | ok |
| House / Dynasty / Clan / Bloodline | Heirlooms (multi) | Artifact / Object / Currency | flag 1 |
| House / Dynasty / Clan / Bloodline | Married Into / Allied (multi) | House / Dynasty / Clan / Bloodline | ok |
| House / Dynasty / Clan / Bloodline | Affiliated Factions (multi) | Faction / Government / Organization | ok |
| Festival / Holiday | Observed By (multi) | Culture / People, Faction / Government / Organization, Religion / Belief System | ok |
| Festival / Holiday | Sacred to (multi) | Deity / Entity | ok |
| Festival / Holiday | Associated Religion (multi) | Religion / Belief System | ok |
| Festival / Holiday | Associated Locations (multi) | Location | ok |
| Historical Event | Preceded By (multi) | Historical Event | ok |
| Historical Event | Followed By (multi) | Historical Event | ok |
| Historical Event | Location (multi) | Location, Cosmology / Plane, Astronomical Body | ok |
| Historical Event | Key Participants (multi) | Character, Faction / Government / Organization, Deity / Entity, Culture / People | ok |
| Location | Parent | Location, Astronomical Body | flag 7 |
| Location | Government / Authority | Faction / Government / Organization | flag 8 |
| Location | Languages Spoken (multi) | ConLang | ok |
| Location | Notable Inhabitants (multi) | Character | ok |
| Magic / Tech System | Related Magic / Technology Systems (multi) | Magic / Tech System | ok |
| Magic / Tech System | Notable Practitioners (multi) | Character, Culture / People, Faction / Government / Organization, Race / Species / Ancestry | ok |
| Plot Thread | POV Character | Character | ok |
| Plot Thread | Key Participants (multi) | Character, Culture / People, Deity / Entity, Faction / Government / Organization | ok |
| Plot Thread | Antagonists (multi) | Character, Cosmology / Plane, Creature, Culture / People, Deity / Entity, Faction / Government / Organization, Location, Race / Species / Ancestry | ok |
| Plot Thread | Related Locations (multi) | Location | ok |
| Plot Thread | Connected Threads (multi) | Plot Thread | ok |
| Race / Species / Ancestry | Innate Magic / Technology (multi) | Magic / Tech System | ok |
| Race / Species / Ancestry | Native Habitat (multi) | Location | flag 7 |
| Race / Species / Ancestry | Cultures (multi) | Culture / People | ok |
| Race / Species / Ancestry | Languages (multi) | ConLang | ok |
| Race / Species / Ancestry | Notable Individuals (multi) | Character | ok |
| Religion / Belief System | Founder | Character | flag 5 |
| Religion / Belief System | Known Magic / Technology Used (multi) | Magic / Tech System | ok |
| Religion / Belief System | Worshipped Deities (multi) | Deity / Entity | ok |
| Religion / Belief System | Notable Figures (multi) | Character | ok |
| Religion / Belief System | Sacred Texts / Scriptures (multi) | Book / Document / Text / Tome | ok |
| Religion / Belief System | Holy Sites (multi) | Location | ok |
| Religion / Belief System | Holy Days (multi) | Festival / Holiday | ok |
| Religion / Belief System | Affiliated Factions (multi) | Faction / Government / Organization | ok |
| Substance / Material | Source / Where Found (multi) | Location | flag 4 |
| Substance / Material | Counter / Antidote (multi) | Substance / Material | ok |
| Theme / Motif | Associated Characters (multi) | Character | ok |
| Theme / Motif | Associated Locations (multi) | Location | ok |
| Theme / Motif | Associated Objects (multi) | Artifact / Object / Currency | flag 1 |
| Theme / Motif | Associated Plot Threads (multi) | Plot Thread | ok |
| Vehicle | Owner / Faction | Faction / Government / Organization | flag 2 |
| Vehicle | Captain / Commander | Character | ok |
| Vehicle | Home Port / Base | Location | ok |
| Vehicle | Power Source (multi) | Magic / Tech System | flag 4 |
| Vehicle | Crew (multi) | Character | ok |
| Weapon / Armor | Current Wielder / Wearer | Character | ok |
| Weapon / Armor | Enchanted / Enhanced With (multi) | Magic / Tech System | ok |
| Weapon / Armor | Materials (multi) | Substance / Material | ok |
| Weapon / Armor | Previous Owners (multi) | Character | flag 2 |
