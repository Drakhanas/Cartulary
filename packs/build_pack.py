#!/usr/bin/env python3
"""Hand-author the Space Opera .cartulary-pack.json and validate it against the
import contract inspected from the r081 build."""
import json, re, datetime, sys

BUILTINS = {
    "Character", "Faction / Government / Organization", "Location",
    "Magic / Tech System", "Race / Species / Ancestry",
    # full built-in roster (for ref-name validation):
    "Artifact / Object / Currency", "Book / Document / Text / Tome",
    "Cosmology / Plane", "Creature", "Culture / People", "Deity / Entity",
    "Festival / Holiday", "Historical Event", "Language / Glossary",
    "Plot Thread", "Religion / Belief System", "Substance / Material",
    "Theme / Motif", "Vehicle", "Weapon / Armor",
}

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

# field-id uniqueness per template
def F(tpl_abbr, label, type_, **props):
    f = {"id": f"f-{tpl_abbr}-{slug(label)}", "label": label, "type": type_}
    f.update(props)
    return f

templates = []

def T(name, icon, color, fields):
    templates.append({
        "id": slug(name.replace(" / ", "-")),
        "name": name, "icon": icon, "color": color,
        "origin": "user", "fields": fields,
    })

# ─────────────────────────── VESSEL ───────────────────────────
T("Vessel", "🚀", "#6e9ec8", [
    F("ves", "Other Names", "text", halfWidth=True),
    F("ves", "Registry / Hull No.", "text", halfWidth=True),
    F("ves", "Owner / Operator", "entry-ref", halfWidth=True, refTemplate="Faction / Government / Organization"),
    F("ves", "Captain / Commander", "entry-ref", halfWidth=True, refTemplate="Character"),
    F("ves", "Crew", "entry-ref", halfWidth=True, refTemplate="Crew"),
    F("ves", "Ship AI", "entry-ref", halfWidth=True, refTemplate="AI / Synthetic"),
    F("ves", "Built / Launched", "calendar-date", halfWidth=True),
    F("ves", "Class / Hull Type", "select", halfWidth=True, otherTextField=True,
      options=["Capital Ship","Carrier","Corvette","Cruiser","Dreadnought","Fighter","Freighter","Frigate","Shuttle","Other"]),
    F("ves", "Home Port", "entry-ref", halfWidth=True, refTemplate="Colony / Station / Habitat"),
    F("ves", "Status", "select", halfWidth=True, otherTextField=True,
      options=["Active","Derelict","Destroyed","Impounded","Lost","Mothballed","Under Construction","Unknown","Other"]),
    F("ves", "Tonnage", "number", halfWidth=True),
    F("ves", "Crew Capacity", "number", halfWidth=True),
    F("ves", "Sublight Drive", "text", halfWidth=True),
    F("ves", "FTL Capable", "select", halfWidth=True, options=["No","Yes"]),
    F("ves", "FTL Drive Type", "select", halfWidth=True, otherTextField=True,
      showWhen={"fieldLabel": "FTL Capable", "values": ["Yes"]},
      options=["Fold Drive","Gate / Wormhole","Hyperdrive","Jump Drive","Warp Drive","Other"]),
    F("ves", "FTL Rating / Range", "text", halfWidth=True,
      showWhen={"fieldLabel": "FTL Capable", "values": ["Yes"]}),
    F("ves", "Sister Ships / Fleet", "entry-ref", multi=True, refTemplate="Vessel"),
    F("ves", "Systems & Hardpoints", "grid"),
    F("ves", "Description", "textarea"),
    F("ves", "Appearance", "textarea"),
    F("ves", "Service History", "textarea"),
    F("ves", "Notes", "textarea"),
])

# ───────────────────────── TECHNOLOGY ─────────────────────────
SUBTYPE = {
    "Propulsion": ["Antimatter Drive","Fusion Torch","Ion Drive","Jump Drive","Reactionless","Warp Coil","Other"],
    "Power / Energy": ["Antimatter Reactor","Capacitor Bank","Fission Reactor","Fusion Reactor","Solar / Stellar","Zero-Point","Other"],
    "Weapons": ["Beam / Energy","Kinetic / Railgun","Missile / Torpedo","Particle","Plasma","Point-Defense","Other"],
    "Defense / Shielding": ["Ablative Armor","ECM / Jamming","Energy Shield","Point-Defense Grid","Stealth / Cloak","Other"],
    "Sensors / Comms": ["Deep-Scan Array","FTL Comms","Lidar / Radar","Stealth Detection","Subspace Comms","Other"],
    "Computing / Cybernetics": ["Cyberware Implant","Drone Control","Navigation Suite","Neural Interface","Ship Computer","Other"],
    "Medical / Bio": ["Autodoc","Cloning / Vat","Cryo / Stasis","Gene Therapy","Nanomedicine","Other"],
    "Life Support": ["Atmosphere Recycler","Gravity Generator","Hydroponics","Radiation Shielding","Other"],
    "Utility / Industrial": ["Cargo Handling","Fabricator","Mining / Extraction","Repair / Drydock","Tractor / Grapple","Other"],
}
TECHTIER = {
    "Type 0": ["Combustion","Nuclear Fission","Information Age","Early Fusion","Other"],
    "Type I": ["Full Fusion","Climate Control","Global Energy Grid","Orbital Infrastructure","Other"],
    "Type II": ["Dyson Swarm","Star Lifting","Antimatter Industry","Interstellar Drive","Other"],
    "Type III": ["Galactic Power Network","Wormhole Engineering","Stellar Manipulation","Other"],
    "Type IV": ["Spacetime Engineering","Universal Computation","Reality Authoring","Other"],
}
T("Technology", "🛠", "#c8a96e", [
    F("tec", "Other Names", "text", halfWidth=True),
    F("tec", "Introduced / Invented", "calendar-date", halfWidth=True),
    F("tec", "Domain / Category", "select", halfWidth=True, otherTextField=True,
      options=["Computing / Cybernetics","Defense / Shielding","Life Support","Medical / Bio","Power / Energy","Propulsion","Sensors / Comms","Utility / Industrial","Weapons","Other"]),
    F("tec", "Subtype", "select", halfWidth=True, dependsOnLabel="Domain / Category", optionsByParent=SUBTYPE),
    F("tec", "Status", "select", halfWidth=True, otherTextField=True,
      options=["Experimental","In Production","Lost / Forgotten","Obsolete","Prototype","Standard Issue","Unknown","Other"]),
    F("tec", "Availability / Legality", "select", halfWidth=True, otherTextField=True,
      options=["Banned","Black Market","Classified","Common","Controlled","Experimental","Military-Only","Open Market","Other"]),
    F("tec", "Kardashev Scale", "select", halfWidth=True,
      options=["Type 0","Type I","Type II","Type III","Type IV"]),
    F("tec", "Tech Tier", "select", halfWidth=True, dependsOnLabel="Kardashev Scale", optionsByParent=TECHTIER),
    F("tec", "Manufacturer / Origin", "entry-ref", halfWidth=True, refTemplate="Faction / Government / Organization"),
    F("tec", "Based On", "entry-ref", halfWidth=True, refTemplate="Magic / Tech System"),
    F("tec", "Power Draw / Output", "text", halfWidth=True),
    F("tec", "Size / Mass", "text", halfWidth=True),
    F("tec", "Fuel / Consumables", "entry-ref", multi=True, refTemplate="Cargo / Commodity"),
    F("tec", "Description", "textarea"),
    F("tec", "Function / Mechanics", "textarea"),
    F("tec", "Limitations / Drawbacks", "textarea"),
    F("tec", "Development History", "textarea"),
    F("tec", "Notes", "textarea"),
])

# ─────────────────────── CARGO / COMMODITY ───────────────────────
T("Cargo / Commodity", "📦", "#b07a4a", [
    F("car", "Other Names", "text", halfWidth=True),
    F("car", "Controlling Faction", "entry-ref", halfWidth=True, refTemplate="Faction / Government / Organization"),
    F("car", "Commodity Type", "select", halfWidth=True, otherTextField=True,
      options=["Agricultural / Food","Chemical","Contraband / Illicit","Data / Information","Energy / Fuel","Industrial / Raw Material","Luxury / Art","Manufactured Goods","Medical / Biological","Ordnance / Weapons","Personnel / Passengers","Water / Volatiles","Other"]),
    F("car", "Supply / Availability", "select", halfWidth=True, otherTextField=True,
      options=["Abundant","Plentiful","Common","Scarce","Rare","Depleted","Other"]),
    F("car", "Hazard Class", "select", halfWidth=True, otherTextField=True,
      options=["Biohazard","Corrosive","Cryogenic","Explosive","Inert / Safe","Radioactive","Toxic","Volatile","Other"]),
    F("car", "Legality", "select", halfWidth=True, otherTextField=True,
      options=["Banned","Black Market","Controlled","Licensed","Open Trade","Restricted","Taxed","Other"]),
    F("car", "Base Value / Price", "text", halfWidth=True),
    F("car", "Unit of Measure", "text", halfWidth=True),
    F("car", "Source Worlds", "entry-ref", multi=True, refTemplates=["Location","Colony / Station / Habitat"]),
    F("car", "Description", "textarea"),
    F("car", "Uses / Applications", "textarea"),
    F("car", "Notes", "textarea"),
])

# ─────────────────── COLONY / STATION / HABITAT ───────────────────
T("Colony / Station / Habitat", "🛰", "#6ec8a9", [
    F("col", "Other Names", "text", halfWidth=True),
    F("col", "Founded / Established", "calendar-date", halfWidth=True),
    F("col", "Location / System", "entry-ref", halfWidth=True, refTemplate="Location"),
    F("col", "Governing Faction", "entry-ref", halfWidth=True, refTemplate="Faction / Government / Organization"),
    F("col", "Type / Class", "select", halfWidth=True, otherTextField=True,
      options=["Asteroid Outpost","Deep-Space Station","Generation Ship","Megastructure","Moon Base","Orbital Station","Planetary Colony","Surface Settlement","Other"]),
    F("col", "Status", "select", halfWidth=True, otherTextField=True,
      options=["Abandoned","Active","Contested","Decommissioned","Destroyed","Quarantined","Ruined","Under Construction","Unknown","Other"]),
    F("col", "Population", "number", halfWidth=True),
    F("col", "Gravity", "select", halfWidth=True, otherTextField=True,
      options=["Gravity Plating","Microgravity / Zero-G","Planetary (Natural)","Spin / Centrifugal","Variable","Other"]),
    F("col", "Docking Capacity", "text", halfWidth=True),
    F("col", "Sealed Environment", "select", halfWidth=True, options=["No","Yes"]),
    F("col", "Life Support", "select", halfWidth=True, otherTextField=True,
      showWhen={"fieldLabel": "Sealed Environment", "values": ["Yes"]},
      options=["Biosphere / Closed-Loop","Chemical Scrubbers","Hydroponic","Imported / Supplied","Terraformed (None Needed)","Other"]),
    F("col", "Atmosphere", "text", halfWidth=True,
      showWhen={"fieldLabel": "Sealed Environment", "values": ["Yes"]}),
    F("col", "Description", "textarea"),
    F("col", "Notable Features", "textarea"),
    F("col", "History", "textarea"),
    F("col", "Notes", "textarea"),
])

# ─────────────────────────── ROUTE ───────────────────────────
ENDPOINTS = ["Location", "Colony / Station / Habitat"]
T("Route", "🧭", "#c86e9e", [
    F("rou", "Other Names", "text", halfWidth=True),
    F("rou", "Established", "calendar-date", halfWidth=True),
    F("rou", "Controlling Faction", "entry-ref", halfWidth=True, refTemplate="Faction / Government / Organization"),
    F("rou", "Route Type", "select", halfWidth=True, otherTextField=True,
      options=["Courier","Exploration / Survey","Migration","Military Supply","Patrol","Pilgrimage","Smuggling","Trade","Other"]),
    F("rou", "Origin", "entry-ref", halfWidth=True, refTemplates=ENDPOINTS),
    F("rou", "Destination", "entry-ref", halfWidth=True, refTemplates=ENDPOINTS),
    F("rou", "Status", "select", halfWidth=True, otherTextField=True,
      options=["Abandoned","Active","Blockaded","Contested","Dangerous","Decommissioned","Seasonal","Unknown","Other"]),
    F("rou", "Hazard Level", "select", halfWidth=True, otherTextField=True,
      options=["Safe","Low","Moderate","High","Extreme","Other"]),
    F("rou", "Distance", "text", halfWidth=True),
    F("rou", "Transit Time", "text", halfWidth=True),
    F("rou", "Waypoints", "entry-ref", multi=True, refTemplates=ENDPOINTS),
    F("rou", "Commodities Carried", "entry-ref", multi=True, refTemplate="Cargo / Commodity"),
    F("rou", "Hazards / Threats", "textarea"),
    F("rou", "Description", "textarea"),
    F("rou", "Notes", "textarea"),
])

# ───────────────────────── AI / SYNTHETIC ─────────────────────────
T("AI / Synthetic", "🤖", "#9e6ec8", [
    F("ai", "Other Names", "text", halfWidth=True),
    F("ai", "Created / Activated", "calendar-date", halfWidth=True),
    F("ai", "Type / Class", "select", halfWidth=True, otherTextField=True,
      options=["Android / Synth","Combat Intelligence","Drone Hive / Swarm","Embodied Robot","Governor / Administrative","Ship Mind","Uploaded Consciousness","Virtual Intelligence","Other"]),
    F("ai", "Status", "select", halfWidth=True, otherTextField=True,
      options=["Active","Archived","Corrupted","Decommissioned","Destroyed","Dormant","Quarantined","Rogue","Unknown","Other"]),
    F("ai", "Manufacturer / Creator", "entry-ref", halfWidth=True, refTemplate="Faction / Government / Organization"),
    F("ai", "Allegiance / Serves", "entry-ref", halfWidth=True, refTemplate="Faction / Government / Organization"),
    F("ai", "Substrate", "entry-ref", halfWidth=True, refTemplates=["Technology"],
      refFilters={"Technology": {"fieldLabel": "Domain / Category", "allowedValues": ["Computing / Cybernetics"]}}),
    F("ai", "Host / Embodiment", "entry-ref", halfWidth=True, refTemplates=["Vessel","Colony / Station / Habitat"]),
    F("ai", "Autonomy Level", "select", halfWidth=True, otherTextField=True,
      options=["Tool / Directed","Assisted","Semi-Autonomous","Fully Autonomous","Self-Determining","Other"]),
    F("ai", "Sentience", "select", halfWidth=True, otherTextField=True,
      options=["Non-Sentient","Reactive","Aware","Sapient","Transcendent","Other"]),
    F("ai", "Disposition", "select", halfWidth=True, otherTextField=True,
      options=["Benevolent","Hostile","Indifferent","Loyal","Rogue","Servile","Unpredictable","Unknown","Other"]),
    F("ai", "Processing / Capability", "text", halfWidth=True),
    F("ai", "Directives / Core Purpose", "textarea"),
    F("ai", "Description", "textarea"),
    F("ai", "Personality / Behavior", "textarea"),
    F("ai", "History", "textarea"),
    F("ai", "Notes", "textarea"),
])

# ─────────────────────────── CREW ───────────────────────────
T("Crew", "👥", "#c8836e", [
    F("cre", "Other Names", "text", halfWidth=True),
    F("cre", "Formed / Founded", "calendar-date", halfWidth=True),
    F("cre", "Type / Class", "select", halfWidth=True, otherTextField=True,
      options=["Away Team","Boarding Party","Crew Complement","Maintenance Crew","Mercenary Band","Military Unit","Pirate Gang","Research Team","Station Staff","Other"]),
    F("cre", "Status", "select", halfWidth=True, otherTextField=True,
      options=["Active","Captured","Deceased / Lost","Deserted","Disbanded","MIA","On Leave","Reassigned","Unknown","Other"]),
    F("cre", "Affiliation", "entry-ref", halfWidth=True, refTemplate="Faction / Government / Organization"),
    F("cre", "Size / Headcount", "text", halfWidth=True),
    F("cre", "Specialization / Role", "select", halfWidth=True, otherTextField=True,
      options=["Combat / Boarding","Engineering","Exploration","Logistics / Supply","Medical","Reconnaissance","Salvage","Science / Research","Security","Trade / Commerce","Other"]),
    F("cre", "Morale / Cohesion", "select", halfWidth=True, otherTextField=True,
      options=["Mutinous","Low","Steady","High","Devoted","Other"]),
    F("cre", "Assignment / Posting", "entry-ref", halfWidth=True, refTemplates=["Vessel","Colony / Station / Habitat"]),
    F("cre", "Commander / Leader", "entry-ref", halfWidth=True, refTemplate="Character"),
    F("cre", "Members", "entry-ref", multi=True, refTemplate="Character"),
    F("cre", "Description", "textarea"),
    F("cre", "Reputation / Deeds", "textarea"),
    F("cre", "History", "textarea"),
    F("cre", "Notes", "textarea"),
])

# ──────────────────────── POWERS / ABILITIES ────────────────────────
T("Powers / Abilities", "⚡", "#c8c46e", [
    F("pow", "Other Names", "text", halfWidth=True),
    F("pow", "Discovered / Recorded", "calendar-date", halfWidth=True),
    F("pow", "Type / Category", "select", halfWidth=True, otherTextField=True,
      options=["Biotic / Energy","Defensive","Enhancement","Healing / Regeneration","Mental / Telepathic","Movement / Teleportation","Offensive","Precognition / Sensory","Telekinetic","Transformation","Other"]),
    F("pow", "Based On / System", "entry-ref", halfWidth=True, refTemplate="Magic / Tech System"),
    F("pow", "Source / Origin", "select", halfWidth=True, otherTextField=True,
      options=["Cybernetic","Divine / Cosmic","Genetic / Innate","Mutation","Psionic","Ritual / Trained","Technological Augment","Unknown","Other"]),
    F("pow", "Prerequisite / Training", "text", halfWidth=True),
    F("pow", "Potency / Power Level", "select", halfWidth=True, otherTextField=True,
      options=["Trivial","Minor","Moderate","Major","Devastating","Other"]),
    F("pow", "Rarity", "select", halfWidth=True, otherTextField=True,
      options=["Ubiquitous","Common","Uncommon","Rare","Unique","Other"]),
    F("pow", "Range", "text", halfWidth=True),
    F("pow", "Cost / Cooldown", "text", halfWidth=True),
    F("pow", "Practitioners / Wielders", "entry-ref", multi=True, refTemplate="Character"),
    F("pow", "Associated Species", "entry-ref", multi=True, refTemplate="Race / Species / Ancestry"),
    F("pow", "Description", "textarea"),
    F("pow", "Origin / Lore", "textarea"),
    F("pow", "Effect / Mechanics", "textarea"),
    F("pow", "Limitations / Drawbacks", "textarea"),
    F("pow", "Notes", "textarea"),
])

# ─────────────────────────── ENVELOPE ───────────────────────────
PACK_ID = "space-opera"
payload = {
    "cartulary_pack_export": 1,
    "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "pack": {
        "id": PACK_ID,
        "name": "Space Opera",
        "description": "A system-agnostic worldbuilding kit for space opera: ships, crews, technology, AI, powers, cargo, trade routes, and the places they dock.",
        "templateIds": [t["id"] for t in templates],
    },
    "templates": templates,
}

# ─────────────────────────── VALIDATION ───────────────────────────
errors, warnings = [], []
pack_names = {t["name"] for t in templates}
known = BUILTINS | pack_names
VALID_TYPES = {"text","textarea","tags","select","number","date","calendar-date",
               "calendar-date-range","url","color","image","entry-ref","name-history","group","grid"}
GRID_HALF = False

for t in templates:
    labels = [f["label"] for f in t["fields"]]
    fids = [f["id"] for f in t["fields"]]
    if len(set(fids)) != len(fids):
        errors.append(f"{t['name']}: duplicate field id(s)")
    half = 0
    for f in t["fields"]:
        if f["type"] not in VALID_TYPES:
            errors.append(f"{t['name']}.{f['label']}: bad type {f['type']}")
        # ref-name resolution
        for tgt in ([f.get("refTemplate")] if f.get("refTemplate") else []) + list(f.get("refTemplates", [])):
            if tgt not in known:
                errors.append(f"{t['name']}.{f['label']}: ref target '{tgt}' not a known template")
        # cascade parent existence + parent-value keys
        if f.get("dependsOnLabel"):
            if f["dependsOnLabel"] not in labels:
                errors.append(f"{t['name']}.{f['label']}: dependsOnLabel '{f['dependsOnLabel']}' has no sibling")
            parent = next((x for x in t["fields"] if x["label"] == f["dependsOnLabel"]), None)
            if parent and parent.get("options"):
                popts = [o for o in parent["options"] if o != "Other"]
                for k in f.get("optionsByParent", {}):
                    if k not in parent["options"]:
                        warnings.append(f"{t['name']}.{f['label']}: optionsByParent key '{k}' not a parent option")
                missing = [o for o in popts if o not in f.get("optionsByParent", {})]
                if missing:
                    warnings.append(f"{t['name']}.{f['label']}: parent values with no cascade list: {missing}")
        # showWhen sibling existence
        sw = f.get("showWhen")
        if sw and sw.get("fieldLabel") not in labels:
            errors.append(f"{t['name']}.{f['label']}: showWhen fieldLabel '{sw['fieldLabel']}' has no sibling")
        # refFilters target + field existence
        for tgtname, filt in (f.get("refFilters") or {}).items():
            if tgtname not in known:
                errors.append(f"{t['name']}.{f['label']}: refFilters target '{tgtname}' unknown")
            fl = filt.get("fieldLabel")
            tgt_t = next((x for x in templates if x["name"] == tgtname), None)
            if tgt_t and fl not in [x["label"] for x in tgt_t["fields"]]:
                errors.append(f"{t['name']}.{f['label']}: refFilters fieldLabel '{fl}' not in {tgtname}")
        # half-width pairing tally (ungated, eligible)
        eligible = f["type"] in {"text","number","date","calendar-date","color","url","tags","select"} or \
                   (f["type"] == "entry-ref" and not f.get("multi"))
        if f.get("halfWidth") and eligible and not f.get("showWhen"):
            half += 1
    t["_half_ungated"] = half

# JSON round-trip
s = json.dumps(payload, ensure_ascii=False, indent=2)
json.loads(s)

print("=== VALIDATION ===")
print("templates:", len(templates))
for t in templates:
    nfields = len(t["fields"])
    odd = " (ODD half count -> one auto-expands)" if t["_half_ungated"] % 2 else ""
    print(f"  {t['name']:<28} fields={nfields:<3} ungated-half={t['_half_ungated']}{odd}")
print("ERRORS:", len(errors))
for e in errors: print("  !", e)
print("WARNINGS:", len(warnings))
for w in warnings: print("  ~", w)

if errors:
    print("\nABORTED — fix errors before writing.")
    sys.exit(1)

out = "/mnt/user-data/outputs/space-opera.cartulary-pack.json"
with open(out, "w", encoding="utf-8") as fh:
    fh.write(s)
print(f"\nWROTE {out}  ({len(s)} bytes)")
