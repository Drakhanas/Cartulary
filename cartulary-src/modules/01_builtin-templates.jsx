
const BUILTIN_TEMPLATES = [
  { name: "Artifact / Object / Currency", icon: "◇", color: "#c8836e",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Artifact", "Component / Module", "Container", "Currency / Coin", "Data Storage", "Device / Gadget", "Furniture", "Garment / Clothing", "Heirloom", "Idol / Icon", "Implant / Cybernetic", "Insignia / Crest", "Jewelry", "Key", "Mundane Object", "Power Source / Battery", "Relic", "Tool", "Trinket / Token", "Other"] },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Corrupted", "Damaged", "Destroyed", "Held", "Hidden", "In Use", "Lost", "Sealed", "Shattered", "Unknown", "Other"] },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Feared", "Forbidden", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"] },
      { label: "Material", type: "entry-ref", refTemplate: "Substance / Material", halfWidth: true },
      { label: "Rarity", type: "select", otherTextField: true, halfWidth: true,
        options: ["Mundane", "Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Unique", "Other"] },
      { label: "Issuing Faction", type: "entry-ref", refTemplate: "Faction / Government / Organization", halfWidth: true,
        showWhen: { fieldLabel: "Type", values: ["Currency / Coin"] } },
      { label: "Currency Details", type: "text", halfWidth: true,
        showWhen: { fieldLabel: "Type", values: ["Currency / Coin"] } },
      { label: "Current Owner", type: "entry-ref", refTemplates: ["Character", "Faction / Government / Organization", "House / Dynasty / Clan / Bloodline"], halfWidth: true },
      { label: "Current Location", type: "entry-ref", refTemplate: "Location", halfWidth: true },
      { label: "Enchanted / Enhanced With", type: "entry-ref", refTemplate: "Magic / Tech System", multi: true },
      { label: "Appearance", type: "textarea" },
      { label: "Properties / Effects", type: "textarea" },
      { label: "Curse / Drawback", type: "textarea" },
      { label: "Origin / Creator", type: "textarea" },
      { label: "Description", type: "textarea" },
      { label: "History", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Book / Document / Text / Tome", icon: "❧", color: "#a89070",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Date Written", type: "calendar-date", halfWidth: true },
      { label: "Author", type: "entry-ref", halfWidth: true,
        refTemplates: ["Character", "Deity / Entity", "Faction / Government / Organization"] },
      { label: "Language", type: "entry-ref", refTemplate: "ConLang", halfWidth: true },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Book", "Charter", "Codex", "Contract", "Data Crystal / Drive", "Database Entry", "Decree", "Diary", "Digital Manuscript / E-Book", "Edict", "Holographic Record", "Inscription", "Journal", "Ledger", "Letter", "Manuscript", "Newspaper", "Pamphlet", "Prophecy", "Scripture / Sacred Text", "Scroll", "Tablet", "Translation", "Transmission / Broadcast", "Treatise", "Treaty", "Will / Testament", "Other"] },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Corrupted", "Destroyed", "Encoded", "Extant", "Forged", "Fragmentary", "Hidden", "Lost", "Sealed", "Unfinished", "Unknown", "Other"] },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Feared", "Forbidden", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"] },
      { label: "Current Location", type: "entry-ref", refTemplate: "Location", halfWidth: true },
      { label: "Current Owner(s)", type: "entry-ref",
        refTemplates: ["Character", "Faction / Government / Organization", "Culture / People"], multi: true },
      { label: "Previous Owner(s)", type: "entry-ref",
        refTemplates: ["Character", "Faction / Government / Organization", "Culture / People"], multi: true },
      { label: "Subject / Summary", type: "textarea" },
      { label: "Contents / Excerpt", type: "textarea" },
      { label: "Significance", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Character", icon: "◈", color: "#c8a96e",
    fields: [
      { label: "Former Names", type: "name-history" },
      { label: "Title", type: "text", halfWidth: true },
      { label: "Aliases", type: "text", halfWidth: true },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Altered / Cursed", "Ascended", "Deceased", "Exiled", "Imprisoned", "In Stasis", "Living", "Missing", "Transformed", "Unknown", "Other"] },
      { label: "Cause of Death", type: "text", halfWidth: true,
        showWhen: { fieldLabel: "Status", values: ["Deceased"] } },
      { label: "Species / Race", type: "entry-ref", refTemplate: "Race / Species / Ancestry", halfWidth: true },
      { label: "Gender / Pronouns", type: "text", halfWidth: true },
      { label: "Father", type: "entry-ref", refTemplate: "Character", relationKind: "parent", halfWidth: true },
      { label: "Mother", type: "entry-ref", refTemplate: "Character", relationKind: "parent", halfWidth: true },
      { label: "Religion", type: "entry-ref", refTemplate: "Religion / Belief System", halfWidth: true },
      { label: "Current Whereabouts", type: "entry-ref", refTemplate: "Location", halfWidth: true },
      { label: "Lifespan", type: "calendar-date-range" },
      { label: "Spouse", type: "entry-ref", refTemplate: "Character", multi: true, relationKind: "spouse" },
      { label: "Languages Spoken", type: "entry-ref", refTemplate: "ConLang", multi: true },
      { label: "Practitioner / Wielder of", type: "entry-ref", refTemplate: "Magic / Tech System", multi: true },
      { label: "Affiliations", type: "entry-ref", refTemplate: "Faction / Government / Organization", multi: true },
      { label: "House / Kin-group", type: "entry-ref", refTemplate: "House / Dynasty / Clan / Bloodline", multi: true },
      { label: "Ally / Mentor", type: "entry-ref",
        refTemplates: ["Character", "Faction / Government / Organization", "Culture / People", "Deity / Entity"], multi: true },
      { label: "Enemies", type: "entry-ref",
        refTemplates: ["Character", "Faction / Government / Organization", "Culture / People", "Deity / Entity"], multi: true },
      { label: "Possessions", type: "entry-ref", refTemplates: ["Artifact / Object / Currency", "Weapon / Armor", "Vehicle"], multi: true },
      { label: "Lineage / Bloodline", type: "textarea" },
      { label: "Appearance", type: "textarea" },
      { label: "Description", type: "textarea" },
      { label: "Background", type: "textarea" },
      { label: "Personality", type: "textarea" },
      { label: "Voice / Speech Pattern", type: "textarea" },
      { label: "Goals / Motivations", type: "textarea" },
      { label: "Abilities / Skills", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Cosmology / Plane", icon: "◯", color: "#a06ec8",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Discovered / Charted", type: "calendar-date", halfWidth: true },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Anomaly", "Astral", "Demi-plane", "Elemental", "Ethereal", "Hyperspace / Subspace", "Inner", "Material", "Mirror", "Outer", "Parallel Universe", "Pocket Dimension", "Simulation / Virtual Space", "Temporal", "Other"] },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Active", "Destroyed", "Forbidden", "Forgotten", "Lost", "Sealed", "Unknown", "Unstable", "Other"] },
      { label: "Time Flow", type: "select", otherTextField: true, halfWidth: true,
        options: ["Normal", "Relative to Material: Faster", "Relative to Material: Slower", "Reversed", "Static / Frozen", "Unknown", "Variable", "Other"] },
      { label: "Ambient Magic / Energy Level", type: "select", otherTextField: true, halfWidth: true,
        options: ["None", "Suppressed", "Weak", "Moderate", "Standard", "Strong", "Saturated", "Variable", "Unknown", "Other"] },
      { label: "Connected Planes", type: "entry-ref", refTemplate: "Cosmology / Plane", multi: true },
      { label: "Ruling Powers", type: "entry-ref", refTemplate: "Deity / Entity", multi: true },
      { label: "Notable Locations", type: "entry-ref", refTemplate: "Location", multi: true },
      { label: "Resident Factions", type: "entry-ref", refTemplate: "Faction / Government / Organization", multi: true },
      { label: "Typical Inhabitants", type: "entry-ref",
        refTemplates: ["Creature", "Race / Species / Ancestry"], multi: true },
      { label: "Access / Entry Points", type: "textarea" },
      { label: "Physical Laws", type: "textarea" },
      { label: "Reality Coherence", type: "textarea" },
      { label: "Description", type: "textarea" },
      { label: "Origin / History", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Creature", icon: "◪", color: "#6ec8a0",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Lifespan", type: "text", halfWidth: true },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Aberration", "Alien / Extraterrestrial", "Beast", "Construct", "Cybernetic Organism / Cyborg", "Dragon", "Elemental", "Fey", "Genetic Mutant / Hybrid", "Insect / Swarm", "Magical Beast", "Ooze", "Outsider / Extraplanar", "Plant", "Robot / Android", "Spirit", "Synthetic Lifeform", "Undead", "Vermin", "Other"] },
      { label: "Subtype", type: "select", otherTextField: true, halfWidth: true,
        dependsOnLabel: "Type",
        optionsByParent: {
          "Aberration": ["Eldritch", "Mind-affecting", "Body-horror", "Cosmic Horror", "Reality-warping", "Other"],
          "Alien / Extraterrestrial": ["Humanoid Alien", "Insectoid", "Reptilian", "Aquatic", "Energy Being", "Hive Mind", "Microbial", "Other"],
          "Beast": ["Mammal", "Reptile", "Amphibian", "Bird", "Fish", "Insect", "Arachnid", "Mollusk", "Crustacean", "Other"],
          "Construct": ["Golem", "Animated Object", "Clockwork", "Magical Construct", "Sentinel / Guardian", "Other"],
          "Cybernetic Organism / Cyborg": ["Limb-augmented", "Neural Implant", "Full-body Conversion", "Bio-mechanical", "Other"],
          "Dragon": ["Chromatic", "Metallic", "Gem", "Wyrm (Great)", "Wyvern", "Drake", "Pseudodragon", "Other"],
          "Elemental": ["Fire", "Water", "Earth", "Air", "Lightning", "Ice", "Shadow", "Light", "Para-elemental", "Other"],
          "Fey": ["Court Fey", "Wild Fey", "Pixie / Sprite", "Hag", "Dryad / Nymph", "Changeling", "Other"],
          "Genetic Mutant / Hybrid": ["Lab-created", "Magical Crossbreed", "Wild Mutation", "Designer Hybrid", "Bio-engineered", "Other"],
          "Insect / Swarm": ["Single Insect", "Hive Swarm", "Locust Plague", "Bee Swarm", "Rat Swarm", "Bat Swarm", "Spider Swarm", "Other"],
          "Magical Beast": ["Owlbear", "Manticore", "Griffin", "Chimera", "Unicorn", "Pegasus", "Cockatrice", "Basilisk", "Hydra", "Other"],
          "Ooze": ["Gelatinous", "Acidic", "Mucoid", "Crystalline", "Black Pudding", "Other"],
          "Outsider / Extraplanar": ["Demon / Fiend", "Devil", "Angel / Celestial", "Yugoloth", "Eldritch Outsider", "Cosmic Being", "Other"],
          "Plant": ["Awakened Tree", "Fungal", "Vine / Creeper", "Carnivorous", "Mossy / Lichen", "Other"],
          "Robot / Android": ["Humanoid Android", "Drone", "Service Bot", "Combat Unit", "Swarm Robot", "Self-replicating", "Other"],
          "Spirit": ["Ghost", "Phantom", "Nature Spirit", "Ancestor Spirit", "Poltergeist", "Apparition", "Other"],
          "Synthetic Lifeform": ["Bio-engineered", "Genetic Construct", "Vat-grown", "Cloned", "Other"],
          "Undead": ["Skeleton", "Zombie", "Ghoul", "Wraith", "Wight", "Lich", "Mummy", "Specter", "Revenant", "Other"],
          "Vermin": ["Rat", "Spider", "Snake", "Bat", "Carrion-feeder", "Crawling Insect", "Other"]
        } },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Cryptid", "Domesticated", "Endangered", "Extinct", "Extraplanar", "Mythical", "Rare", "Unknown", "Other"] },
      { label: "Sentience Level", type: "select", otherTextField: true, halfWidth: true,
        options: ["Mindless", "Feral", "Cunning", "Sapient", "Unknown", "Other"] },
      { label: "Threat Level / Danger Rating", type: "select", otherTextField: true, halfWidth: true,
        options: ["Harmless", "Minor", "Moderate", "Major", "Lethal", "Apocalyptic / World-ending", "Variable", "Unknown", "Other"] },
      { label: "Size / Scale", type: "select", otherTextField: true, halfWidth: true,
        options: ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan", "Colossal", "Variable", "Unknown", "Other"] },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Feared", "Forbidden", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"] },
      { label: "Cultural Reach", type: "select", otherTextField: true, halfWidth: true,
        options: ["Local", "Regional", "Continental", "Global", "Cosmic", "Variable", "Unknown", "Other"] },
      { label: "Habitat", type: "select", otherTextField: true, halfWidth: true,
        options: ["Aerial", "Aquatic", "Coastal", "Desert", "Extraplanar", "Forest / Woodland", "Grassland / Plains", "Jungle / Rainforest", "Mountain", "Polar / Tundra", "Subterranean / Cave", "Swamp / Wetland", "Urban", "Volcanic", "Variable", "Unknown", "Other"] },
      { label: "Diet", type: "select", otherTextField: true, halfWidth: true,
        options: ["Carnivore", "Energy / Magical", "Herbivore", "Insectivore", "Omnivore", "Parasitic", "Photosynthetic", "Piscivore", "Scavenger", "None", "Variable", "Unknown", "Other"] },
      { label: "Innate Magic / Technology", type: "entry-ref", refTemplate: "Magic / Tech System", multi: true },
      { label: "Variants / Subspecies", type: "textarea" },
      { label: "Reproduction / Lifecycle", type: "textarea" },
      { label: "Abilities / Traits", type: "textarea" },
      { label: "Weaknesses", type: "textarea" },
      { label: "Lore / Cultural Significance", type: "textarea" },
      { label: "Description", type: "textarea" },
      { label: "Behavior", type: "textarea" },
      { label: "Origin / History", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Culture / People", icon: "⚜", color: "#b89568",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Active", "Assimilated", "Extinct", "Forgotten", "Hidden", "Suppressed", "Unknown", "Other"] },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Caste", "Civilization", "Clan / Lineage / Family", "Diaspora", "Ethnic Group", "Subculture", "Tribe", "Other"] },
      { label: "Subtype", type: "select", otherTextField: true, halfWidth: true,
        dependsOnLabel: "Type",
        optionsByParent: {
          "Caste": ["Aristocratic", "Artisan", "Merchant", "Outcast / Pariah", "Priestly", "Scholar", "Slave / Bonded", "Warrior", "Working", "Other"],
          "Civilization": ["Agrarian", "Industrial", "Maritime", "Mercantile", "Nomadic", "Pastoral", "Post-Industrial", "Space-faring", "Theocratic", "Other"],
          "Clan / Lineage / Family": ["Aristocratic", "Dynastic / Royal", "Mercantile", "Religious", "Warrior", "Working / Common", "Other"],
          "Diaspora": ["Economic / Trade", "Forced / Exiled", "Imperial", "Refugee", "Religious", "Voluntary", "Other"],
          "Ethnic Group": ["Hybrid / Mixed", "Indigenous", "Migratory", "Pastoral", "Settled", "Settler / Colonial", "Other"],
          "Subculture": ["Academic / Scholarly", "Artistic", "Counterculture", "Criminal / Underworld", "Religious / Sectarian", "Technological", "Trade / Guild", "Other"],
          "Tribe": ["Confederation", "Hunter-Gatherer", "Nomadic", "Pastoral", "Semi-Settled", "Warband", "Other"]
        } },
      { label: "Founded / Established", type: "calendar-date", halfWidth: true },
      { label: "Population & Distribution", type: "text", halfWidth: true },
      { label: "Cultural Magic / Technology", type: "entry-ref", refTemplate: "Magic / Tech System", multi: true },
      { label: "Associated Races", type: "entry-ref", refTemplate: "Race / Species / Ancestry", multi: true },
      { label: "Associated Locations", type: "entry-ref", refTemplate: "Location", multi: true },
      { label: "Languages", type: "entry-ref", refTemplate: "ConLang", multi: true },
      { label: "Religions", type: "entry-ref", refTemplate: "Religion / Belief System", multi: true },
      { label: "Notable Members", type: "entry-ref", refTemplate: "Character", multi: true },
      { label: "Values / Ethos", type: "textarea" },
      { label: "Customs & Traditions", type: "textarea" },
      { label: "Family / Social Structure", type: "textarea" },
      { label: "Daily Life", type: "textarea" },
      { label: "Dress & Cuisine", type: "textarea" },
      { label: "Art & Architecture", type: "textarea" },
      { label: "Origin / History", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Deity / Entity", icon: "✦", color: "#dcc78a",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Active", "Ascendant", "Banished", "Diminished", "Dormant", "Imprisoned", "Lost", "Risen", "Sealed", "Slain", "Unknown", "Other"] },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["AI / Machine Intelligence", "Ancestor Spirit", "Angel", "Ascended Mortal", "Avatar / Aspect", "Cosmic Entity / Outer God", "Deity", "Demigod", "Demon", "Egregore", "Eidolon", "Fiend", "Genius Loci", "Personification", "Primordial / Titan", "Spirit", "Tulpa", "Other"] },
      { label: "Power Tier", type: "select", otherTextField: true, halfWidth: true,
        options: ["Petty / Minor", "Lesser", "Intermediate", "Greater", "High God", "Overgod", "Cosmic / Outer", "Variable", "Unknown", "Other"] },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Feared", "Forbidden", "Forgotten", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"] },
      { label: "Cultural Reach", type: "select", otherTextField: true, halfWidth: true,
        options: ["Local", "Regional", "Continental", "Global", "Cosmic", "Variable", "Unknown", "Other"] },
      { label: "Domains / Portfolio", type: "select", otherTextField: true, halfWidth: true,
        options: ["Agriculture / Harvest", "Beauty / Love", "Commerce / Trade", "Corruption / Decay", "Craft / Smithing", "Creation", "Death / Underworld", "Destruction", "Earth / Land", "Fate / Prophecy", "Fear / Terror", "Fertility", "Fire / Forge", "Forest / Wild", "Healing / Medicine", "Hunt", "Justice / Law", "Knowledge / Wisdom", "Life", "Light / Sun", "Madness / Insanity", "Magic", "Murder / Bloodshed", "Music / Arts", "Night / Moon", "Plague / Disease", "Psionics", "Sea / Water", "Sky / Air", "Storm / Weather", "Suffering / Pain", "Time", "Travel", "Trickery / Deception", "Tyranny", "War", "Other"] },
      { label: "Alignment / Disposition", type: "text", halfWidth: true },
      { label: "Known Grantable Magic / Technology", type: "entry-ref", refTemplate: "Magic / Tech System", multi: true },
      { label: "Pantheon", type: "entry-ref", refTemplate: "Religion / Belief System", multi: true },
      { label: "Holy Sites", type: "entry-ref", refTemplate: "Location", multi: true },
      { label: "Worshippers", type: "entry-ref",
        refTemplates: ["Faction / Government / Organization", "Culture / People", "Character"], multi: true },
      { label: "Allied Powers", type: "entry-ref",
        refTemplates: ["Deity / Entity", "Faction / Government / Organization", "Character"], multi: true },
      { label: "Opposing Powers", type: "entry-ref",
        refTemplates: ["Deity / Entity", "Faction / Government / Organization", "Character"], multi: true },
      { label: "Symbol / Iconography", type: "textarea" },
      { label: "Appearance / Manifestation", type: "textarea" },
      { label: "Description", type: "textarea" },
      { label: "Boons / Powers", type: "textarea" },
      { label: "Origin / History", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Faction / Government / Organization", icon: "◆", color: "#c86e6e",
    fields: [
      { label: "Former Names", type: "name-history" },
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Founded", type: "calendar-date", halfWidth: true },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Academic Society", "Cabal / Coven", "City State", "Clan / Tribe", "Corporation", "Council", "Court", "Criminal Syndicate", "Cult", "Government / State", "Guild", "Intelligence Agency", "Knightly Order", "Mercenary Company", "Military Unit", "Movement", "Noble House", "Religious Order", "Resistance / Rebellion", "Secret Society / Lodge", "Tribunal", "Other"] },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Active", "Defunct", "Disbanded", "Dormant", "Exiled", "Fragmented", "Reformed", "Splintered", "Underground", "Unknown", "Other"] },
      { label: "Parent Organization", type: "entry-ref", refTemplate: "Faction / Government / Organization", halfWidth: true },
      { label: "Alignment / Ideology", type: "text", halfWidth: true },
      { label: "Headquarters", type: "entry-ref", refTemplate: "Location", halfWidth: true },
      { label: "Membership Size", type: "text", halfWidth: true },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Feared", "Forbidden", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"] },
      { label: "Cultural Reach", type: "select", otherTextField: true, halfWidth: true,
        options: ["Local", "Regional", "Continental", "Global", "Cosmic", "Variable", "Unknown", "Other"] },
      { label: "Active Period", type: "calendar-date-range" },
      { label: "Known Magic / Technology Used", type: "entry-ref", refTemplate: "Magic / Tech System", multi: true },
      { label: "Leadership", type: "entry-ref",
        refTemplates: ["Character", "Deity / Entity", "Faction / Government / Organization"], multi: true },
      { label: "Notable Members", type: "entry-ref", refTemplate: "Character", multi: true },
      { label: "Allies", type: "entry-ref",
        refTemplates: ["Faction / Government / Organization", "Character", "Culture / People", "Deity / Entity"], multi: true },
      { label: "Enemies", type: "entry-ref",
        refTemplates: ["Faction / Government / Organization", "Character", "Culture / People", "Deity / Entity"], multi: true },
      { label: "Symbol / Insignia", type: "textarea" },
      { label: "Goals", type: "textarea" },
      { label: "Methods / Tactics", type: "textarea" },
      { label: "Description", type: "textarea" },
      { label: "Public Perception", type: "textarea" },
      { label: "Origin / History", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "House / Dynasty / Clan / Bloodline", icon: "❖", color: "#a8557e",
    fields: [
      { label: "Former Names", type: "name-history" },
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["House", "Dynasty", "Clan", "Tribe", "Bloodline", "Magical Line", "Sept", "Cadet Branch", "Royal House", "Noble House", "Lineage", "Other"] },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Ruling", "Ascendant", "Established", "Declining", "Cadet", "Exiled", "Fallen", "Extinct", "Dormant", "Unknown", "Other"] },
      { label: "Founder", type: "entry-ref", refTemplate: "Character", halfWidth: true },
      { label: "Current Head", type: "entry-ref", refTemplate: "Character", halfWidth: true },
      { label: "Seat", type: "entry-ref", refTemplate: "Location", halfWidth: true },
      { label: "Founded", type: "calendar-date", halfWidth: true },
      { label: "Descended From / Cadet Of", type: "entry-ref", refTemplate: "House / Dynasty / Clan / Bloodline", halfWidth: true },
      { label: "Culture / People", type: "entry-ref", refTemplate: "Culture / People", halfWidth: true },
      { label: "Race / Species", type: "entry-ref", refTemplate: "Race / Species / Ancestry", halfWidth: true },
      { label: "Words / Motto", type: "text", halfWidth: true },
      { label: "Active Span", type: "calendar-date-range" },
      { label: "Cadet Branches", type: "entry-ref", refTemplate: "House / Dynasty / Clan / Bloodline", multi: true },
      { label: "Members", type: "entry-ref", refTemplate: "Character", multi: true },
      { label: "Holdings / Domains", type: "entry-ref", refTemplate: "Location", multi: true },
      { label: "Heirlooms", type: "entry-ref", refTemplates: ["Artifact / Object / Currency", "Weapon / Armor"], multi: true },
      { label: "Married Into / Allied", type: "entry-ref", refTemplate: "House / Dynasty / Clan / Bloodline", multi: true },
      { label: "Affiliated Factions", type: "entry-ref", refTemplate: "Faction / Government / Organization", multi: true },
      { label: "Sigil / Arms", type: "textarea" },
      { label: "Origin / History", type: "textarea" },
      { label: "Description", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Festival / Holiday", icon: "✺", color: "#c89ec8",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Calendar Date", type: "calendar-date", halfWidth: true },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Civic", "Commemorative", "Cultural", "Dynastic / Royal", "Fertility", "Founding Day", "Harvest", "Martial", "Mourning", "New Year", "Pilgrimage", "Religious", "Rite of Passage", "Seasonal", "Secret", "Wedding / Marriage", "Other"] },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Abolished", "Active", "Defunct", "Dormant", "Forgotten", "Modernized", "Revived", "Suspended", "Unknown", "Other"] },
      { label: "Frequency", type: "select", otherTextField: true, halfWidth: true,
        options: ["Annual", "Biennial", "Decennial", "Lunar Cycle", "Millennial", "Monthly", "Multiple Times per Year", "One-Time / Singular", "Quarterly", "Solar Cycle", "Variable / Unpredictable", "Weekly", "Other"] },
      { label: "Duration", type: "text", halfWidth: true },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Feared", "Forbidden", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"] },
      { label: "Cultural Reach", type: "select", otherTextField: true, halfWidth: true,
        options: ["Local", "Regional", "Continental", "Global", "Cosmic", "Variable", "Unknown", "Other"] },
      { label: "Observed By", type: "entry-ref",
        refTemplates: ["Culture / People", "Faction / Government / Organization", "Religion / Belief System"], multi: true },
      { label: "Sacred to", type: "entry-ref", refTemplate: "Deity / Entity", multi: true },
      { label: "Associated Religion", type: "entry-ref", refTemplate: "Religion / Belief System", multi: true },
      { label: "Associated Locations", type: "entry-ref", refTemplate: "Location", multi: true },
      { label: "Symbol / Iconography", type: "textarea" },
      { label: "Description", type: "textarea" },
      { label: "Activities / Practices", type: "textarea" },
      { label: "Origin / Mythology", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Historical Event", icon: "◉", color: "#9ec86e",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Calendar Date", type: "calendar-date", halfWidth: true },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Battle", "Birth / Death", "Cultural Event", "Diplomatic Event", "Disaster", "Discovery / Exploration", "Economic Event", "Founding / Establishment", "Marriage / Union", "Migration / Exodus", "Plague / Epidemic", "Reformation / Revolution", "Religious Event", "Ritual / Ceremony", "Succession / Election", "Supernatural Event", "Trial / Tribunal", "War / Campaign", "Other"] },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Apocryphal", "Confirmed Historical", "Disputed", "Forgotten", "Misattributed", "Mythologized", "Unknown", "Other"] },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Feared", "Forbidden", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"] },
      { label: "Cultural Reach", type: "select", otherTextField: true, halfWidth: true,
        options: ["Local", "Regional", "Continental", "Global", "Cosmic", "Variable", "Unknown", "Other"] },
      { label: "Preceded By", type: "entry-ref", refTemplate: "Historical Event", multi: true },
      { label: "Duration", type: "calendar-date-range" },
      { label: "Followed By", type: "entry-ref", refTemplate: "Historical Event", multi: true },
      { label: "Location", type: "entry-ref",
        refTemplates: ["Location", "Cosmology / Plane", "Astronomical Body"], multi: true },
      { label: "Key Participants", type: "entry-ref",
        refTemplates: ["Character", "Faction / Government / Organization", "Deity / Entity", "Culture / People"], multi: true },
      { label: "Description", type: "textarea" },
      { label: "Causes", type: "textarea" },
      { label: "Consequences", type: "textarea" },
      { label: "Notable Quotes", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  // "Language / Glossary" is superseded by Glossopoeia: the ConLang container
  // (state.glossopoeia.conlangs) and the Lexicon's Lexeme (state.glossopoeia.
  // lexemes). It is no longer seeded into fresh worlds. Existing worlds migrate
  // their L/G entries into the slice at load; see the supersede in migrate().
  { name: "Location", icon: "◎", color: "#6e9ec8",
    fields: [
      { label: "Former Names", type: "name-history" },
      { label: "Parent", type: "entry-ref", halfWidth: true,
        refTemplates: ["Location", "Astronomical Body"] },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Abandoned", "Active", "Contested", "Destroyed", "Fictional", "Hidden", "Lost", "Mythical", "Restored", "Restricted", "Ruined", "Sealed", "Thriving", "Under Construction", "Other"] },
      { label: "Type", type: "select", required: true, otherTextField: true, halfWidth: true,
        options: ["Environmental", "Settlement", "Fortification", "Domain", "Structure", "Site", "Other"] },
      { label: "Subtype", type: "select", required: true, otherTextField: true, halfWidth: true,
        dependsOnLabel: "Type",
        optionsByParent: {
          "Environmental": ["Canyon", "Cave", "Cavern", "Coastline", "Continent", "Crater", "Desert", "Forest", "Glacier / Ice Sheet", "Grove", "Hill", "Jungle", "Lake", "Marsh", "Mountain", "Mountain Range", "Ocean", "Plains", "Pond", "Reef / Atoll", "River", "Sea", "Spring", "Steppe / Savanna", "Stream", "Subcontinent", "Tundra", "Valley", "Volcano", "Wetlands", "Other"],
          "Settlement": ["Arcology", "Camp", "City", "Colony", "Domed City", "Encampment", "Hamlet", "Megacity", "Metropolis", "Orbital Settlement", "Outpost", "Thorp", "Town", "Trading Post", "Village", "Other"],
          "Fortification": ["Bastion", "Beacon", "Bunker", "Castle", "Citadel", "Defense Platform", "Fort", "Fortress", "Garrison", "Gate", "Keep", "Tower", "Wall", "Watchpost", "Other"],
          "Domain": ["Barony", "Borough", "City-State", "Confederation", "County", "District", "Dominion", "Duchy", "Empire", "Estate", "Federation", "Fief", "Hegemony", "Kingdom", "Land", "Lordship", "March", "Nation", "Principality", "Province", "Reach", "Realm", "Region", "Republic", "Sector", "Ward", "Other"],
          "Structure": ["Apartment Block", "Aqueduct", "Arena", "Bakery", "Bank", "Bathhouse", "Brewery", "Bridge", "Brothel", "Communication Array", "Court", "Dam", "Datacenter", "Dungeon", "Factory", "Forge", "Granary", "Greenhouse / Hydroponics", "Habitat", "Hangar", "Hermitage", "Hospital", "Inn", "Laboratory", "Library", "Lighthouse", "Manor", "Market", "Mausoleum", "Mill", "Mine", "Monastery", "Observatory", "Office", "Power Plant / Reactor", "Prison", "Quarry", "Refinery", "Ruin", "School", "Shop", "Shrine", "Spaceport", "Stable", "Tavern", "Temple", "Theater", "Tower", "Warehouse", "Workshop / Garage", "Other"],
          "Site": ["Anomaly", "Battlefield", "Border", "Burial Ground", "Crash Site", "Crossroads", "Hunting Ground", "Landmark", "Memorial", "Monument", "Oracle Site", "Pilgrimage Site", "Portal Site", "Ritual Ground", "Sacred Grove", "Standing Stones", "Trade Waypoint", "Wreck Site", "Other"],
          "Other": ["Other"]
        } },
      { label: "Climate / Weather", type: "text", halfWidth: true },
      { label: "Founded / Discovered", type: "calendar-date", halfWidth: true },
      { label: "Government / Authority", type: "entry-ref", refTemplate: "Faction / Government / Organization", halfWidth: true },
      { label: "Population", type: "text", halfWidth: true },
      { label: "Languages Spoken", type: "entry-ref", refTemplate: "ConLang", multi: true },
      { label: "Notable Inhabitants", type: "entry-ref", refTemplate: "Character", multi: true },
      { label: "Description", type: "textarea" },
      { label: "Significance", type: "textarea" },
      { label: "Atmosphere / Mood", type: "textarea" },
      { label: "Economy / Trade", type: "textarea" },
      { label: "Defenses / Threats", type: "textarea" },
      { label: "History", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Magic / Tech System", icon: "⬡", color: "#c8c06e",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Magnitude / Scale", type: "select", otherTextField: true, halfWidth: true,
        options: ["Cantrip / Trivial", "Minor", "Moderate", "Major", "World-shaking", "Cosmic / Reality-altering", "Variable", "Unknown", "Other"] },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Aerospace / Space-faring","Alchemy","Arcane / Wizardry","Bardic / Sonic","Biotechnology / Genetic","Blood / Hemomancy","Clockwork / Mechanical","Conceptual","Cybernetic","Divine / Theurgy","Druidic / Nature","Elemental","Enchantment / Imbuement","Industrial","Information / Computing","Innate / Sorcerous","Magitech","Nanotechnology","Necromancy","Psionic / Mental","Ritual / Ceremonial","Robotics / AI","Rune / Sigil","Shamanic / Spirit","Steampunk / Steam","Summoning / Binding","Other"] },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Active","Declining","Discovered","Forgotten","Lost","Reconstructed","Speculative / Theoretical","Unknown","Other"] },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common","Feared","Forbidden","Regulated","Restricted","Revered","Sacred","Suppressed","Tolerated","Unknown","Other"] },
      { label: "Cultural Reach", type: "select", otherTextField: true, halfWidth: true,
        options: ["Local", "Regional", "Continental", "Global", "Cosmic", "Variable", "Unknown", "Other"] },
      { label: "Related Magic / Technology Systems", type: "entry-ref", refTemplate: "Magic / Tech System", multi: true },
      { label: "Notable Practitioners", type: "entry-ref",
        refTemplates: ["Character","Culture / People","Faction / Government / Organization","Race / Species / Ancestry"], multi: true },
      { label: "Description", type: "textarea" },
      { label: "Source of Power", type: "textarea" },
      { label: "Rules / Mechanics", type: "textarea" },
      { label: "Cost / Limitations", type: "textarea" },
      { label: "Components / Tools", type: "textarea" },
      { label: "Access Prerequisites", type: "textarea" },
      { label: "Counter-magic / Defenses", type: "textarea" },
      { label: "Origin / History", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Plot Thread", icon: "◑", color: "#c86ea8", fabulaRole: "threads",
    fields: [
      { label: "POV Character", type: "entry-ref", refTemplate: "Character", halfWidth: true },
      { label: "Genre", type: "select", otherTextField: true, halfWidth: true,
        options: ["Coming of Age","Conflict / War","Conspiracy","Discovery / Exploration","Heist","Investigation / Mystery","Political Intrigue","Prophecy / Destiny","Quest / Journey","Rebellion / Resistance","Redemption","Revenge","Romance","Survival","Tragedy","Other"] },
      { label: "Scope", type: "select", otherTextField: true, halfWidth: true,
        options: ["Arc","Background","Main / Throughline","Side Quest","Subplot","Other"] },
      { label: "Story Function", type: "select", otherTextField: true, halfWidth: true,
        options: ["A-plot","B-plot","Setup","Payoff","Red Herring","Mystery Box","Callback","Frame Story","Other"] },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Abandoned","Active","Brewing","Dormant","Failed","Potential","Resolved","Stalled","Suspended","Other"] },
      { label: "Resolution Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Tragic","Triumphant","Bittersweet","Pyrrhic","Open / Ambiguous","Unresolved","TBD","Other"] },
      { label: "Timespan", type: "calendar-date-range" },
      { label: "Key Participants", type: "entry-ref",
        refTemplates: ["Character","Culture / People","Deity / Entity","Faction / Government / Organization"], multi: true },
      { label: "Antagonists", type: "entry-ref",
        refTemplates: ["Character","Cosmology / Plane","Creature","Culture / People","Deity / Entity","Faction / Government / Organization","Location","Race / Species / Ancestry"], multi: true },
      { label: "Related Locations", type: "entry-ref", refTemplate: "Location", multi: true },
      { label: "Connected Threads", type: "entry-ref", refTemplate: "Plot Thread", multi: true },
      { label: "Stakes", type: "textarea" },
      { label: "Hooks / Entry Points", type: "textarea" },
      { label: "Description", type: "textarea" },
      { label: "Possible Resolutions", type: "textarea" },
      { label: "Hidden Truth", type: "textarea", secret: true },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Race / Species / Ancestry", icon: "◬", color: "#8eb89c",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Lifespan", type: "text", halfWidth: true },
      { label: "BroadType", type: "select", otherTextField: true, halfWidth: true,
        options: ["Aberration / Eldritch", "Alien / Extraterrestrial", "Beast / Animal", "Beastfolk / Anthropomorphic", "Construct / Automaton", "Cursed / Transformed", "Elemental", "Fey", "Humanoid", "Hybrid / Crossbreed", "Mutant / Augmented", "Mythic / Legendary", "Outsider / Extraplanar", "Plant / Vegetal", "Spirit / Incorporeal", "Synthetic / AI", "Undead", "Other"] },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        dependsOnLabel: "BroadType",
        optionsByParent: {
          "Aberration / Eldritch": ["Eldritch Entity", "Mind-affecting", "Body-horror", "Cosmic Horror", "Reality-warping", "Tentacle Horror", "Slug-like / Worm-like", "Eldritch Spawn", "Other"],
          "Alien / Extraterrestrial": ["Humanoid Alien", "Insectoid Alien", "Reptilian Alien", "Aquatic Alien", "Energy Being", "Gas / Plasma Being", "Hive Mind", "Silicon-based", "Crystalline", "Microbial", "Posthuman", "Other"],
          "Beast / Animal": ["Mammal", "Reptile", "Amphibian", "Bird", "Fish", "Insect", "Arachnid", "Mollusk", "Crustacean", "Annelid", "Other"],
          "Beastfolk / Anthropomorphic": ["Catfolk", "Foxfolk", "Wolffolk", "Birdfolk", "Lizardfolk", "Ratfolk", "Frogfolk", "Tortlefolk", "Centaur", "Minotaur", "Satyr", "Faun", "Other"],
          "Construct / Automaton": ["Golem", "Clockwork Automaton", "Animated Object", "Magical Construct", "Sentinel / Guardian", "Homunculus", "Mimic", "Other"],
          "Cursed / Transformed": ["Vampire", "Lycanthrope", "Wendigo", "Doppelganger", "Possessed Being", "Cursed Being", "Other"],
          "Elemental": ["Fire", "Water", "Earth", "Air", "Lightning / Storm", "Ice / Cold", "Shadow / Darkness", "Light / Radiant", "Smoke", "Crystal", "Para-elemental", "Energy / Plasma", "Other"],
          "Fey": ["Court / Noble Fey", "Wild / Unseelie", "Sidhe", "Pixie / Sprite", "Brownie", "Hag", "Changeling", "Dryad / Tree Spirit", "Nymph", "Gremlin / Mischief Fey", "Other"],
          "Humanoid": ["Human", "Elf", "Dwarf", "Halfling", "Gnome", "Orc", "Goblin / Goblinoid", "Giant / Giantkin", "Tiefling", "Aasimar", "Genasi", "Dragonborn", "Other"],
          "Hybrid / Crossbreed": ["Half-Human", "Half-Elf", "Half-Orc", "Cambion", "Magical Crossbreed", "Genetic Hybrid", "Bio-engineered", "Mixed Heritage", "Other"],
          "Mutant / Augmented": ["Radiation Mutant", "Genetic Mutant", "Magical Mutation", "Cyborg / Augmented", "Bio-engineered", "Posthuman", "Awakened", "Other"],
          "Mythic / Legendary": ["Dragon", "Phoenix", "Unicorn", "Griffin", "Manticore", "Chimera", "Sphinx", "Pegasus", "Kraken", "Hydra", "Basilisk", "Cockatrice", "Roc", "Other"],
          "Outsider / Extraplanar": ["Demon / Fiend", "Devil", "Angel / Celestial", "Yugoloth / Neutral Outsider", "Eldritch Outsider", "Cosmic Being", "Other"],
          "Plant / Vegetal": ["Treant / Awakened Tree", "Fungal / Myconid", "Vine / Creeper", "Floral", "Carnivorous Plant", "Walking Plant", "Lichen / Mossy", "Other"],
          "Spirit / Incorporeal": ["Ghost", "Phantom", "Echo", "Ancestor Spirit", "Nature Spirit", "Poltergeist", "Apparition", "Soul", "Other"],
          "Synthetic / AI": ["Humanoid Android", "Drone", "Service Bot", "Combat Unit", "AI Construct", "Digital Entity", "Swarm Robot", "Self-replicating", "Sentient Program", "Bio-engineered", "Other"],
          "Undead": ["Skeleton", "Zombie", "Ghoul", "Wraith", "Wight", "Lich", "Mummy", "Specter", "Banshee", "Revenant", "Death Knight", "Other"]
        } },
      { label: "Subtype", type: "select", otherTextField: true, halfWidth: true,
        dependsOnLabel: "Type",
        optionsByParent: {
          "Eldritch Entity": ["Ancient One", "Outer God", "Inner God", "Lesser Eldritch", "Avatar", "Spawn", "Other"],
          "Mind-affecting": ["Mind Flayer", "Dream Eater", "Memory Thief", "Psychic Vampire", "Madness-inducing", "Hypnotic", "Other"],
          "Body-horror": ["Flesh-mass", "Mutating", "Tumorous", "Eyeless", "Mouth-ridden", "Fleshcrafter", "Other"],
          "Cosmic Horror": ["Outer One", "Star-spawn", "Void-dweller", "Cosmic Predator", "Galactic Horror", "Other"],
          "Reality-warping": ["Probability-bender", "Time-distorter", "Space-twister", "Truth-corruptor", "Other"],
          "Tentacle Horror": ["Many-armed", "Lashing", "Grasping", "Suckered", "Squirming", "Other"],
          "Slug-like / Worm-like": ["Burrowing", "Acidic", "Devouring", "Parasitic", "Sandworm", "Other"],
          "Eldritch Spawn": ["Lesser Spawn", "Greater Spawn", "Hatchling", "Larval", "Adult", "Other"],
          "Humanoid Alien": ["Tall / Gracile", "Squat / Robust", "Asymmetric", "Tentacled", "Wing-bearing", "Skull-elongated", "Other"],
          "Insectoid Alien": ["Hive-drone", "Warrior-caste", "Queen / Egg-laying", "Solitary", "Carapaced", "Other"],
          "Reptilian Alien": ["Scaled", "Saurian", "Cold-blooded", "Hooded", "Crested", "Other"],
          "Aquatic Alien": ["Cephalopodic", "Finned", "Gilled", "Pressure-adapted", "Bioluminescent", "Other"],
          "Energy Being": ["Plasma", "Electromagnetic", "Photonic", "Thermal", "Gravitic", "Other"],
          "Gas / Plasma Being": ["Cloud-form", "Vapor", "Aerosol", "Diffuse", "Crystallizing", "Other"],
          "Hive Mind": ["Insectoid Hive", "Synaptic Network", "Telepathic Collective", "Symbiotic", "Other"],
          "Silicon-based": ["Crystalline-bodied", "Lattice-mind", "Geological", "Slow-metabolic", "Other"],
          "Crystalline": ["Geometric", "Faceted", "Living Crystal", "Resonant", "Other"],
          "Microbial": ["Single-cell", "Colony Organism", "Viral", "Mycelial Network", "Other"],
          "Posthuman": ["Uplifted Human", "Far-future Descendant", "Transhuman", "Augmented Lineage", "Uploaded Consciousness", "Body-modified", "Transcendent", "Other"],
          "Mammal": ["Predator", "Prey", "Aquatic", "Arboreal", "Subterranean", "Flying / Airborne", "Other"],
          "Reptile": ["Snake", "Lizard", "Crocodilian", "Turtle", "Other"],
          "Amphibian": ["Frog / Toad", "Salamander", "Caecilian", "Other"],
          "Bird": ["Raptor", "Songbird", "Waterfowl", "Flightless", "Wading", "Other"],
          "Fish": ["Freshwater", "Saltwater", "Cartilaginous (shark)", "Bottom-dweller", "Pelagic", "Other"],
          "Insect": ["Hymenoptera", "Coleoptera", "Lepidoptera", "Diptera", "Other"],
          "Arachnid": ["Spider", "Scorpion", "Tick / Mite", "Other"],
          "Mollusk": ["Cephalopod", "Bivalve", "Gastropod", "Other"],
          "Crustacean": ["Decapod", "Isopod", "Barnacle", "Other"],
          "Annelid": ["Earthworm", "Leech", "Marine Worm", "Tubeworm", "Other"],
          "Catfolk": ["House Cat-like", "Lion-like", "Tiger-like", "Leopard-like", "Lynx-like", "Cheetah-like", "Other"],
          "Foxfolk": ["Red", "Arctic", "Fennec", "Kitsune-like", "Silver", "Other"],
          "Wolffolk": ["Gray", "Dire", "Arctic", "Timber", "Lupin", "Other"],
          "Birdfolk": ["Owl", "Crow / Raven", "Hawk / Falcon", "Eagle", "Songbird", "Aarakocra", "Other"],
          "Lizardfolk": ["Standard", "Marsh", "Swamp", "Saurian", "Iguanid", "Other"],
          "Ratfolk": ["Standard", "Sewer", "Wild", "Plague-touched", "Other"],
          "Frogfolk": ["Bullywug", "Poison Dart", "Tree Frog", "Bog-dweller", "Other"],
          "Tortlefolk": ["Land Tortle", "Sea Tortle", "Snapping", "Other"],
          "Centaur": ["Plains", "Forest", "Highlands", "Star-touched", "Other"],
          "Minotaur": ["Bull", "Bison", "Aurochs", "Labyrinth-born", "Other"],
          "Satyr": ["Forest", "Wild", "Bacchic", "Other"],
          "Faun": ["Forest", "Pastoral", "Other"],
          "Golem": ["Clay", "Stone", "Iron", "Flesh", "Wood", "Glass", "Bone", "Magical Material", "Other"],
          "Clockwork Automaton": ["Simple Mechanical", "Complex Mechanical", "Steam-powered", "Magical-Mechanical", "Other"],
          "Animated Object": ["Furniture", "Weapon", "Statue", "Tool", "Armor", "Other"],
          "Magical Construct": ["Arcane Servitor", "Summoned", "Spell-bound", "Elemental-bound", "Other"],
          "Sentinel / Guardian": ["Guardian", "Watcher", "Protector", "Door-warden", "Other"],
          "Homunculus": ["Arcane", "Biological", "Alchemical", "Familiar-class", "Other"],
          "Mimic": ["Object Mimic", "Lesser Mimic", "Mimic Lord", "Door / Chest", "Other"],
          "Vampire": ["Classic Vampire", "Vampire Spawn", "Daywalker", "Psychic Vampire", "Vampire Lord", "Nosferatu", "Other"],
          "Lycanthrope": ["Werewolf", "Werebear", "Werecat", "Wererat", "Werebat", "Wereboar", "Weretiger", "Other"],
          "Wendigo": ["Hungering", "Frost-touched", "Forest", "Spiritual", "Other"],
          "Doppelganger": ["Standard", "Greater", "Mind-shifter", "Voice-stealer", "Other"],
          "Possessed Being": ["Spirit-possessed", "Demon-possessed", "Multi-possessed", "Object-bound", "Other"],
          "Cursed Being": ["Geas-bound", "Hex-touched", "Family Curse", "Object-cursed", "Self-cursed", "Other"],
          "Fire": ["Lesser", "Greater", "Smoke-touched", "Volcanic", "Hellfire", "Other"],
          "Water": ["Lesser", "Greater", "Tidal", "Storm-water", "Deep-ocean", "Other"],
          "Earth": ["Lesser", "Greater", "Mountain", "Crystalline", "Magma", "Other"],
          "Air": ["Lesser", "Greater", "Storm", "Cyclone", "High-altitude", "Other"],
          "Lightning / Storm": ["Lesser", "Greater", "Thunder-touched", "Tempest", "Static", "Other"],
          "Ice / Cold": ["Lesser", "Greater", "Frost", "Glacial", "Hailstorm", "Other"],
          "Shadow / Darkness": ["Lesser", "Greater", "Void-touched", "Umbral", "Penumbral", "Other"],
          "Light / Radiant": ["Lesser", "Greater", "Solar", "Lunar", "Radiant Aura", "Other"],
          "Smoke": ["Lesser", "Greater", "Toxic", "Ash-touched", "Other"],
          "Crystal": ["Quartz", "Geode", "Faceted", "Resonant", "Other"],
          "Para-elemental": ["Magma (fire-earth)", "Steam (fire-water)", "Ooze (earth-water)", "Ice (air-water)", "Smoke (fire-air)", "Dust (earth-air)", "Other"],
          "Energy / Plasma": ["Plasmatic", "Electromagnetic", "Photonic", "Thermal", "Other"],
          "Court / Noble Fey": ["Seelie Court", "Unseelie Court", "Summer Court", "Winter Court", "Twilight", "Wild Hunt", "Other"],
          "Wild / Unseelie": ["Goblin Court", "Solitary", "Anarchic", "Wild Hunt", "Other"],
          "Sidhe": ["Tuatha Dé", "Aos Sí", "Daoine Sidhe", "Banshee-Sidhe", "Other"],
          "Pixie / Sprite": ["Pixie", "Sprite", "Fairy", "Will-o'-Wisp", "Other"],
          "Brownie": ["House Brownie", "Field Brownie", "Domovoi-like", "Other"],
          "Hag": ["Annis", "Green", "Sea", "Night", "Bheur", "Other"],
          "Changeling": ["Fey-swap", "Glamoured", "Hidden", "Half-Fey", "Other"],
          "Dryad / Tree Spirit": ["Oak Dryad", "Willow Dryad", "Pine Dryad", "Hamadryad", "Other"],
          "Nymph": ["Naiad", "Oread", "Hamadryad", "Nereid", "Limnad", "Other"],
          "Gremlin / Mischief Fey": ["Trickster", "Saboteur", "Glitch-Fey", "Other"],
          "Human": ["Standard", "Ethnic Variant", "Augmented / Modified", "Half-Blooded", "Ancient Sub-strain", "Far-future Posthuman", "Other"],
          "Elf": ["High Elf", "Wood Elf", "Sea / Aquatic Elf", "Drow / Dark Elf", "Sun Elf", "Moon Elf", "Star Elf", "Astral / Spaceborne Elf", "Wild Elf", "Snow Elf", "Eladrin", "Other"],
          "Dwarf": ["Hill Dwarf", "Mountain Dwarf", "Deep Dwarf / Duergar", "Sea Dwarf", "Frost Dwarf", "Other"],
          "Halfling": ["Lightfoot", "Stout", "Ghostwise", "Strongheart", "Tallfellow", "Other"],
          "Gnome": ["Forest Gnome", "Rock Gnome", "Deep Gnome", "Tinker Gnome", "Other"],
          "Orc": ["Mountain Orc", "Plains Orc", "Forest Orc", "Sea Orc", "Half-Orc Ancestry", "Other"],
          "Goblin / Goblinoid": ["Goblin", "Hobgoblin", "Bugbear", "Ogre", "Other"],
          "Giant / Giantkin": ["Hill Giant", "Stone Giant", "Frost Giant", "Fire Giant", "Cloud Giant", "Storm Giant", "Storm Lord", "Other"],
          "Tiefling": ["Asmodean", "Mephistophelean", "Bloodline-specific", "Variant", "Fallen-blood", "Other"],
          "Aasimar": ["Protector", "Scourge", "Fallen", "Variant", "Other"],
          "Genasi": ["Air", "Earth", "Fire", "Water", "Para-elemental", "Other"],
          "Dragonborn": ["Chromatic", "Metallic", "Gem", "Variant", "Other"],
          "Half-Human": ["Half-Elf", "Half-Orc", "Half-Dwarf", "Half-Giant", "Half-Beast", "Other Half-Human", "Other"],
          "Half-Elf": ["Half-High Elf", "Half-Wood Elf", "Half-Drow", "Variant", "Other"],
          "Half-Orc": ["Mountain Orc-blooded", "Plains Orc-blooded", "Half-Goblinoid Variant", "Other"],
          "Cambion": ["Demon-blooded", "Devil-blooded", "Lesser", "Greater", "Other"],
          "Magical Crossbreed": ["Spell-induced", "Wild Magic Origin", "Curse-born", "Ritual Origin", "Other"],
          "Genetic Hybrid": ["Cross-species", "Sub-species Cross", "Designer", "Accident", "Other"],
          "Bio-engineered": ["Designer Strain", "Lab-created", "Genetically Spliced", "Vat-grown", "Splice-augmented", "Synthetic Biology", "Living Machine", "Cyber-organic", "Cloned-hybrid", "Other"],
          "Mixed Heritage": ["Cultural Mix", "Multi-generational", "Ethnic Blend", "Other"],
          "Radiation Mutant": ["Mild", "Severe", "Beneficial Mutation", "Cancerous", "Stable Strain", "Other"],
          "Genetic Mutant": ["Born", "Latent", "Activated", "Generational", "Other"],
          "Magical Mutation": ["Wild Magic", "Curse-induced", "Spell-residue", "Familiar-bond", "Other"],
          "Cyborg / Augmented": ["Limb Augmented", "Neural Implant", "Full-body Conversion", "Cosmetic", "Combat Augment", "Other"],
          "Awakened": ["Spontaneous", "Induced", "Sleep-released", "Sacrament-evoked", "Other"],
          "Dragon": ["Chromatic", "Metallic", "Gem", "Wyrm (Great)", "Wyvern", "Drake", "Pseudodragon", "Dracolich", "Other"],
          "Phoenix": ["Solar", "Lunar", "Ash", "Crystal", "Other"],
          "Unicorn": ["Pure", "Corrupted", "Black", "Sea-", "Variant", "Other"],
          "Griffin": ["Standard", "Greater", "Hippogriff", "Royal", "Other"],
          "Manticore": ["Standard", "Greater", "Lion-variant", "Tiger-variant", "Other"],
          "Chimera": ["Goat-Lion-Dragon", "Variant-Mix", "Custom Blend", "Other"],
          "Sphinx": ["Andro-", "Gyno-", "Crio-", "Hiera-", "Greater", "Lesser", "Other"],
          "Pegasus": ["Standard", "Greater", "Storm-touched", "Astral", "Other"],
          "Kraken": ["Lesser", "Greater", "Ancient", "Other"],
          "Hydra": ["Standard", "Lernean", "Multi-headed", "Regenerating", "Other"],
          "Basilisk": ["Standard", "Greater", "Lesser", "Other"],
          "Cockatrice": ["Standard", "Greater", "Variant", "Other"],
          "Roc": ["Standard", "Greater", "Mountain-peak", "Other"],
          "Demon / Fiend": ["Greater Demon", "Lesser Demon", "Imp", "Succubus / Incubus", "Demon Lord", "Demon Prince", "Other"],
          "Devil": ["Greater Devil", "Lesser Devil", "Imp", "Pit Fiend", "Arch-Devil", "Erinyes", "Other"],
          "Angel / Celestial": ["Archangel", "Cherub", "Seraph", "Throne", "Virtue", "Dominion", "Power", "Other"],
          "Yugoloth / Neutral Outsider": ["Lesser", "Greater", "Ultroloth", "Mezzoloth", "Nycaloth", "Other"],
          "Eldritch Outsider": ["Outer Power", "Inner Power", "Avatar", "Spawn", "Cult-aspect", "Other"],
          "Cosmic Being": ["Greater Power", "Lesser Power", "Avatar of Concept", "Embodied Force", "Other"],
          "Treant / Awakened Tree": ["Oak", "Ash", "Willow", "Pine", "Ancient", "Sapling", "Other"],
          "Fungal / Myconid": ["Spore-caster", "Mind-spore", "Cap-soldier", "Mushroom Lord", "Other"],
          "Vine / Creeper": ["Strangler", "Ivy-walker", "Thorned", "Carnivorous-vine", "Other"],
          "Floral": ["Flower-walker", "Rose-thorn", "Lotus", "Pollen-cloud", "Other"],
          "Carnivorous Plant": ["Venus-class", "Pitcher-class", "Sundew-class", "Greater Hunter", "Other"],
          "Walking Plant": ["Walking Tree", "Walking Bush", "Sprouted", "Vine-walker", "Other"],
          "Lichen / Mossy": ["Cliff-dweller", "Cave-mossy", "Slow-creeper", "Symbiotic", "Other"],
          "Ghost": ["Restless", "Vengeful", "Benevolent", "Confused", "Bound to Place", "Bound to Object", "Other"],
          "Phantom": ["Apparition", "Manifestation", "Recurring", "Memory-echo", "Other"],
          "Echo": ["Memory", "Resonance", "Repetition", "Trauma-imprint", "Other"],
          "Ancestor Spirit": ["Guardian", "Honored", "Forgotten", "Demanding", "Other"],
          "Nature Spirit": ["Forest", "Mountain", "River", "Ocean", "Sky", "Storm", "Hearth", "Other"],
          "Poltergeist": ["Standard", "Powerful", "Object-throwing", "Sound-only", "Other"],
          "Apparition": ["Visible", "Audible", "Tactile", "Multi-sensory", "Other"],
          "Soul": ["Departed", "Wandering", "Trapped", "Reborn-fragment", "Other"],
          "Humanoid Android": ["Realistic", "Stylized", "Combat-frame", "Service-frame", "Companion", "Other"],
          "Drone": ["Aerial", "Ground", "Aquatic", "Microscopic", "Combat", "Surveillance", "Other"],
          "Service Bot": ["Janitorial", "Hospitality", "Medical", "Tutorial", "Other"],
          "Combat Unit": ["Foot Soldier", "Mech", "Sniper", "Heavy Weapons", "Stealth", "Other"],
          "AI Construct": ["Singleton AI", "Distributed", "Embodied", "Disembodied", "Sub-routine", "Other"],
          "Digital Entity": ["Virtual Persona", "Datasprite", "Net-walker", "Code-bound", "Other"],
          "Swarm Robot": ["Nano-swarm", "Macro-swarm", "Hivemind Swarm", "Specialized", "Other"],
          "Self-replicating": ["Von Neumann", "Berserker", "Limited-replicator", "Other"],
          "Sentient Program": ["Awakened", "Custom-built", "Emergent", "Escaped", "Other"],
          "Skeleton": ["Animated", "Necromantic", "Warrior", "Mage", "Greater", "Other"],
          "Zombie": ["Slow / Shambling", "Fast", "Plague", "Greater", "Necro-zombie", "Other"],
          "Ghoul": ["Standard", "Greater", "Mind-ghoul", "Ghast", "Other"],
          "Wraith": ["Standard", "Greater", "Specter-wraith", "Dread-wraith", "Other"],
          "Wight": ["Standard", "Greater", "Death-knight Wight", "Mummy-wight", "Other"],
          "Lich": ["Standard", "Demilich", "Archlich", "Liche-king", "Other"],
          "Mummy": ["Standard", "Greater", "Mummy Lord", "Cursed-mummy", "Other"],
          "Specter": ["Standard", "Greater", "Bound-specter", "Other"],
          "Banshee": ["Standard", "Greater", "Wailing", "Other"],
          "Revenant": ["Standard", "Vengeful", "Honor-bound", "Sworn-task", "Other"],
          "Death Knight": ["Fallen Paladin", "Cursed Knight", "Bound-knight", "Greater", "Other"]
        } },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Uncommon", "Rare", "Endangered", "Critically Endangered", "Extinct", "Mythical", "Unknown", "Other"] },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Feared", "Forbidden", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"] },
      { label: "Cultural Reach", type: "select", otherTextField: true, halfWidth: true,
        options: ["Local", "Regional", "Continental", "Global", "Cosmic", "Variable", "Unknown", "Other"] },
      { label: "Innate Magic / Technology", type: "entry-ref", refTemplate: "Magic / Tech System", multi: true },
      { label: "Native Habitat", type: "entry-ref", refTemplate: "Location", multi: true },
      { label: "Cultures", type: "entry-ref", refTemplate: "Culture / People", multi: true },
      { label: "Languages", type: "entry-ref", refTemplate: "ConLang", multi: true },
      { label: "Notable Individuals", type: "entry-ref", refTemplate: "Character", multi: true },
      { label: "Physical Traits", type: "textarea" },
      { label: "Special Abilities", type: "textarea" },
      { label: "Reproduction / Lifecycle", type: "textarea" },
      { label: "Origin / Creation", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Religion / Belief System", icon: "❂", color: "#c4b896",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Active", "Underground", "Extinct", "Heretical", "Unknown", "Other"] },
      { label: "Founder", type: "entry-ref", refTemplates: ["Character", "Deity / Entity"], halfWidth: true },
      { label: "Founded / Established", type: "calendar-date", halfWidth: true },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Monotheistic", "Polytheistic", "Pantheistic", "Animistic", "Ancestor Worship", "Cult", "Mystery Religion", "Philosophy", "Other"] },
      { label: "Subtype", type: "select", otherTextField: true, halfWidth: true,
        dependsOnLabel: "Type",
        optionsByParent: {
          "Monotheistic": ["Abrahamic-like", "Solar", "Lunar", "Singular Creator", "Logos-based", "Other"],
          "Polytheistic": ["Pantheon", "Family-pantheon", "Animistic-poly", "Henotheistic", "Other"],
          "Pantheistic": ["Universal Mind", "Nature-pantheism", "Cosmic Consciousness", "Panentheistic", "Other"],
          "Animistic": ["Spirit-of-place", "Totemic", "Ancestral", "Shamanic", "Other"],
          "Ancestor Worship": ["Family-line", "Tribal", "Cult of Founders", "Imperial", "Other"],
          "Cult": ["Personality Cult", "Doomsday Cult", "Mystery Cult", "Death Cult", "Pleasure Cult", "Other"],
          "Mystery Religion": ["Initiation-based", "Hidden Doctrine", "Secret Sect", "Gnostic", "Other"],
          "Philosophy": ["Ethical System", "Stoic-like", "Dialectical", "Logical", "Mystical Philosophy", "Other"]
        } },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Feared", "Forbidden", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"] },
      { label: "Cultural Reach", type: "select", otherTextField: true, halfWidth: true,
        options: ["Local", "Regional", "Continental", "Global", "Cosmic", "Variable", "Unknown", "Other"] },
      { label: "Known Magic / Technology Used", type: "entry-ref", refTemplate: "Magic / Tech System", multi: true },
      { label: "Worshipped Deities", type: "entry-ref", refTemplate: "Deity / Entity", multi: true },
      { label: "Notable Figures", type: "entry-ref", refTemplate: "Character", multi: true },
      { label: "Sacred Texts / Scriptures", type: "entry-ref", refTemplate: "Book / Document / Text / Tome", multi: true },
      { label: "Holy Sites", type: "entry-ref", refTemplate: "Location", multi: true },
      { label: "Holy Days", type: "entry-ref", refTemplate: "Festival / Holiday", multi: true },
      { label: "Affiliated Factions", type: "entry-ref", refTemplate: "Faction / Government / Organization", multi: true },
      { label: "Description", type: "textarea" },
      { label: "Symbol / Iconography", type: "textarea" },
      { label: "Core Doctrine / Tenets", type: "textarea" },
      { label: "Practices / Rites", type: "textarea" },
      { label: "Hierarchy / Structure", type: "textarea" },
      { label: "Schisms / Sects", type: "textarea" },
      { label: "Origin / History", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Substance / Material", icon: "⚗", color: "#9c8eb8",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Active / In Use", "Restricted", "Discovered", "Theoretical", "Synthetic", "Extinct / Depleted", "Unknown", "Other"] },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Metal / Alloy", "Mineral / Stone", "Organic", "Liquid / Fluid", "Gas / Vapor", "Crystal / Gem", "Compound", "Drug / Medicine", "Poison / Toxin", "Magical / Reagent", "Fictional Element", "Other"] },
      { label: "Subtype", type: "select", otherTextField: true, halfWidth: true,
        dependsOnLabel: "Type",
        optionsByParent: {
          "Metal / Alloy": ["Ferrous", "Non-ferrous", "Precious", "Alloy", "Reactive", "Radioactive", "Other"],
          "Mineral / Stone": ["Igneous", "Sedimentary", "Metamorphic", "Crystalline", "Ore-bearing", "Other"],
          "Organic": ["Plant-derived", "Animal-derived", "Microbial", "Decomposed", "Fermented", "Other"],
          "Liquid / Fluid": ["Water-based", "Oil-based", "Alcoholic", "Acidic", "Caustic", "Mercurial", "Viscous", "Other"],
          "Gas / Vapor": ["Atmospheric", "Toxic", "Noble", "Reactive", "Explosive", "Other"],
          "Crystal / Gem": ["Precious", "Semi-precious", "Industrial", "Magical", "Cursed", "Other"],
          "Compound": ["Synthetic", "Natural", "Organic Compound", "Inorganic", "Hybrid", "Other"],
          "Drug / Medicine": ["Analgesic", "Antibiotic", "Stimulant", "Sedative", "Hallucinogen", "Vaccine", "Other"],
          "Poison / Toxin": ["Lethal", "Paralytic", "Hallucinatory", "Slow-acting", "Antidote-resistant", "Necrotic", "Other"],
          "Magical / Reagent": ["Catalyst", "Component", "Solvent", "Binder", "Focus", "Other"],
          "Fictional Element": ["Sci-fi alloy", "Fantasy metal", "Cosmic-origin", "Plot-device", "Other"]
        } },
      { label: "Trade Value", type: "text", halfWidth: true },
      { label: "Rarity", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Unique", "Mythical", "Unknown", "Other"] },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Feared", "Forbidden", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"] },
      { label: "Cultural Reach", type: "select", otherTextField: true, halfWidth: true,
        options: ["Local", "Regional", "Continental", "Global", "Cosmic", "Variable", "Unknown", "Other"] },
      { label: "Source / Where Found", type: "entry-ref", refTemplates: ["Location", "Creature", "Astronomical Body"], multi: true },
      { label: "Counter / Antidote", type: "entry-ref", refTemplate: "Substance / Material", multi: true },
      { label: "Description / Appearance", type: "textarea" },
      { label: "Properties", type: "textarea" },
      { label: "Effects / Uses", type: "textarea" },
      { label: "Side Effects / Dangers", type: "textarea" },
      { label: "Extraction / Production", type: "textarea" },
      { label: "Cultural Significance", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Theme / Motif", icon: "◐", color: "#b0a8c8", fabulaRole: "themes",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Tone / Mood", type: "select", otherTextField: true, halfWidth: true,
        options: ["Bittersweet", "Comedic", "Dark", "Hopeful", "Ironic", "Nihilistic", "Optimistic", "Pessimistic", "Romantic", "Tragic", "Variable", "Unknown", "Other"] },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Theme", "Motif", "Symbol", "Leitmotif", "Archetype", "Other"] },
      { label: "Subtype", type: "select", otherTextField: true, halfWidth: true,
        dependsOnLabel: "Type",
        optionsByParent: {
          "Theme": ["Major", "Minor", "Underlying", "Counter-theme", "Resolved", "Other"],
          "Motif": ["Visual", "Auditory", "Tactile", "Symbolic", "Behavioral", "Other"],
          "Symbol": ["Object", "Action", "Color", "Number", "Animal", "Element", "Other"],
          "Leitmotif": ["Musical", "Phrasal", "Visual", "Behavioral", "Other"],
          "Archetype": ["Jungian", "Joseph Campbell", "Genre-specific", "Hero", "Trickster", "Mentor", "Shadow", "Other"]
        } },
      { label: "Prevalence", type: "select", otherTextField: true, halfWidth: true,
        options: ["Dominant", "Recurring", "Occasional", "Subtle", "Variable", "Unknown", "Other"] },
      { label: "Universality", type: "select", otherTextField: true, halfWidth: true,
        options: ["Universal", "Cultural", "Personal", "Genre-specific", "Setting-specific", "Unknown", "Other"] },
      { label: "Associated Characters", type: "entry-ref", refTemplate: "Character", multi: true },
      { label: "Associated Locations", type: "entry-ref", refTemplate: "Location", multi: true },
      { label: "Associated Objects", type: "entry-ref", refTemplates: ["Artifact / Object / Currency", "Weapon / Armor", "Vehicle"], multi: true },
      { label: "Associated Plot Threads", type: "entry-ref", refTemplate: "Plot Thread", multi: true },
      { label: "Description", type: "textarea" },
      { label: "How It Appears", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Vehicle", icon: "▷", color: "#8ea8c4",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Classification / Class", type: "text", halfWidth: true },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["Active", "In Service", "Decommissioned", "Lost", "Destroyed", "Captured", "Under Repair", "Unknown", "Other"] },
      { label: "Built / Launched", type: "calendar-date", halfWidth: true },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Ship / Vessel", "Aircraft", "Spacecraft", "Ground Vehicle", "Mount / Beast", "Mecha / Construct", "Submersible", "Mythic / Magical", "Other"] },
      { label: "Subtype", type: "select", otherTextField: true, halfWidth: true,
        dependsOnLabel: "Type",
        optionsByParent: {
          "Ship / Vessel": ["Battleship", "Cruiser", "Frigate", "Destroyer", "Galleon", "Galley", "Sloop", "Carrack", "Junk", "Longship", "Caravel", "Schooner", "Other"],
          "Aircraft": ["Fighter", "Bomber", "Transport", "Recon", "Helicopter", "Glider", "Airship", "Hot Air Balloon", "Other"],
          "Spacecraft": ["Fighter", "Cruiser", "Cargo Hauler", "Mining Ship", "Research Vessel", "Capital Ship", "Drone", "Shuttle", "Generation Ship", "Other"],
          "Ground Vehicle": ["Car", "Truck", "Tank", "APC", "Motorcycle", "Bicycle", "Wagon", "Carriage", "Train", "Chariot", "Other"],
          "Mount / Beast": ["Horse", "Camel", "Elephant", "Dragon", "Griffin", "Pegasus", "Wyvern", "Hippogriff", "War Mount", "Other"],
          "Mecha / Construct": ["Light Mecha", "Heavy Mecha", "Powered Armor", "Battle Walker", "Animated Construct", "Other"],
          "Submersible": ["Submarine", "Bathyscaphe", "Diving Bell", "Aquatic Mecha", "Other"],
          "Mythic / Magical": ["Flying Carpet", "Magical Boat", "Phoenix Carriage", "Astral Galleon", "Cosmic Vessel", "Other"]
        } },
      { label: "Owner / Faction", type: "entry-ref", refTemplates: ["Faction / Government / Organization", "Character", "House / Dynasty / Clan / Bloodline"], halfWidth: true },
      { label: "Captain / Commander", type: "entry-ref", refTemplate: "Character", halfWidth: true },
      { label: "Propulsion / Power", type: "text", halfWidth: true },
      { label: "Passenger / Cargo Capacity", type: "text", halfWidth: true },
      { label: "Crew Capacity", type: "text", halfWidth: true },
      { label: "Home Port / Base", type: "entry-ref", refTemplate: "Location", halfWidth: true },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Feared", "Forbidden", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"] },
      { label: "Cultural Reach", type: "select", otherTextField: true, halfWidth: true,
        options: ["Local", "Regional", "Continental", "Global", "Cosmic", "Variable", "Unknown", "Other"] },
      { label: "Power Source", type: "entry-ref", refTemplates: ["Magic / Tech System", "Substance / Material"], multi: true },
      { label: "Crew", type: "entry-ref", refTemplate: "Character", multi: true },
      { label: "Description", type: "textarea" },
      { label: "Appearance", type: "textarea" },
      { label: "Armament", type: "textarea" },
      { label: "Defenses", type: "textarea" },
      { label: "Notable Voyages / Incidents", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
  { name: "Weapon / Armor", icon: "⚔", color: "#a89070",
    fields: [
      { label: "Other Names", type: "text", halfWidth: true },
      { label: "Status", type: "select", otherTextField: true, halfWidth: true,
        options: ["In Use", "Held", "Stored", "Lost", "Destroyed", "Sealed", "Hidden", "Unknown", "Other"] },
      { label: "Type", type: "select", otherTextField: true, halfWidth: true,
        options: ["Melee Weapon", "Ranged Weapon", "Thrown Weapon", "Firearm", "Energy Weapon", "Siege Weapon", "Light Armor", "Medium Armor", "Heavy Armor", "Powered Armor / Exosuit", "Shield", "Helm / Headgear", "Environment Suit", "Cybernetic / Implant", "Biological Weapon", "Other"] },
      { label: "Subtype", type: "select", otherTextField: true, halfWidth: true,
        dependsOnLabel: "Type",
        optionsByParent: {
          "Melee Weapon": ["Sword", "Dagger", "Axe", "Mace", "Hammer", "Spear", "Polearm", "Staff", "Whip", "Energy Sword", "Vibroblade", "Power Hammer", "Other"],
          "Ranged Weapon": ["Bow", "Crossbow", "Sling", "Atlatl", "Blowgun", "Other"],
          "Thrown Weapon": ["Throwing Knife", "Javelin", "Throwing Axe", "Shuriken", "Bola", "Grenade", "Plasma Grenade", "Other"],
          "Firearm": ["Pistol", "Rifle", "Shotgun", "Submachine Gun", "Sniper Rifle", "Machine Gun", "Railgun", "Coilgun", "Gauss Rifle", "Smart Gun", "Other"],
          "Energy Weapon": ["Laser", "Plasma", "Particle Beam", "Sonic", "Disintegrator", "Blaster", "Phaser", "Ion Cannon", "EMP", "Other"],
          "Siege Weapon": ["Catapult", "Trebuchet", "Ballista", "Cannon", "Battering Ram", "Mass Driver", "Orbital Strike", "Artillery", "Other"],
          "Light Armor": ["Padded", "Leather", "Studded Leather", "Hide", "Chain Shirt", "Nanoweave", "Stealth Suit", "Reactive Cloth", "Other"],
          "Medium Armor": ["Chainmail", "Scale Mail", "Breastplate", "Half Plate", "Combat Vest", "Reactive Armor", "Other"],
          "Heavy Armor": ["Plate", "Splint", "Banded Mail", "Full Plate", "Battle Armor", "Heavy Combat Suit", "Other"],
          "Powered Armor / Exosuit": ["Light Exosuit", "Medium Exosuit", "Heavy Exosuit", "Stealth Suit", "Mech Frame", "Industrial Exosuit", "Other"],
          "Shield": ["Buckler", "Round Shield", "Kite Shield", "Tower Shield", "Heater", "Energy Shield", "Force Field", "Riot Shield", "Other"],
          "Helm / Headgear": ["Open Helmet", "Closed Helmet", "Great Helm", "Coif", "Circlet", "Combat Helmet", "HUD Helmet", "Other"],
          "Environment Suit": ["Space Suit", "Hazmat Suit", "Underwater Suit", "Vacuum Suit", "Radiation Suit", "Diving Suit", "Other"],
          "Cybernetic / Implant": ["Combat Augment", "Sensory Augment", "Strength Augment", "Neural Implant", "Limb Replacement", "Internal Weapon", "Other"],
          "Biological Weapon": ["Toxin", "Pathogen", "Engineered Parasite", "Genetic Weapon", "Plague", "Bioweapon Vector", "Other"]
        } },
      { label: "Damage / Protection", type: "text", halfWidth: true },
      { label: "Reach / Range", type: "text", halfWidth: true },
      { label: "Weight Class", type: "select", otherTextField: true, halfWidth: true,
        options: ["Light", "Medium", "Heavy", "Variable", "Negligible", "Unknown", "Other"] },
      { label: "Handedness", type: "select", otherTextField: true, halfWidth: true,
        options: ["One-Handed", "Two-Handed", "Versatile", "Worn / Equipped", "Mounted", "Unknown", "Other"] },
      { label: "Built / Forged", type: "calendar-date", halfWidth: true },
      { label: "Current Wielder / Wearer", type: "entry-ref", refTemplate: "Character", halfWidth: true },
      { label: "Cultural Position", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common", "Feared", "Forbidden", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"] },
      { label: "Cultural Reach", type: "select", otherTextField: true, halfWidth: true,
        options: ["Local", "Regional", "Continental", "Global", "Cosmic", "Variable", "Unknown", "Other"] },
      { label: "Enchanted / Enhanced With", type: "entry-ref", refTemplate: "Magic / Tech System", multi: true },
      { label: "Materials", type: "entry-ref", refTemplate: "Substance / Material", multi: true },
      { label: "Previous Owners", type: "entry-ref", refTemplates: ["Character", "Faction / Government / Organization", "House / Dynasty / Clan / Bloodline"], multi: true },
      { label: "Origin / Smith / Maker", type: "textarea" },
      { label: "Appearance / Description", type: "textarea" },
      { label: "Properties / Enchantments", type: "textarea" },
      { label: "Drawback / Curse", type: "textarea" },
      { label: "History", type: "textarea" },
      { label: "Notes", type: "textarea" },
    ]},
];

// How a reference field's target names map to ids, and ids back to names:
// every template by name, then the registered node sources. Split out of
// resolveTemplateRefs in v1.7 r002 so syncRefTargetNames below resolves names
// exactly as it does.
// BODY_REF_LABEL ("Astronomical Body") is a sentinel name that doesn't map to
// any real template; it represents state.celestialBodies as a ref target.
// Adding it here lets refTemplates author-facing lists use the same
// mechanism for both entry-templates and bodies. The picker recognizes
// BODY_REF_SENTINEL and switches to body-listing mode.
// r077/r081: map the body label (and its legacy alias) to the sentinel, but
// ONLY if no real template already claims that name — a real template always
// wins. This matters because the label was renamed to the Ephemeris workspace
// name ("Astronomical Body"), which is also what the deleted v1.4 built-in was
// called and a natural name for a user to recreate. Multi-template refs
// re-resolve from names whenever resolveTemplateRefs runs (see fix() below), so
// an unconditional assignment would silently hijack a user's same-named template.
// ConLang is the Glossopoeia language-container sentinel (state.glossopoeia.
// conlangs), the supersede target for the retired Language / Glossary
// template. Same guard: a real user template named "ConLang" wins.
// v1.7 r002: the same guard for every other registered source (Lexeme, Map and
// the rest), whose names a template or pack file could use and lost here.
// allSources false resolves names as before r002 (body label and ConLang only).
const refTargetIndex = (templates, allSources = true) => {
  const byName = {};
  const nameById = new Map();
  templates.forEach(t => { if (t && t.id) { byName[t.name] = t.id; nameById.set(t.id, t.name); } });
  if (!(BODY_REF_LABEL in byName)) byName[BODY_REF_LABEL] = BODY_REF_SENTINEL;
  if (!("Celestial Body" in byName)) byName["Celestial Body"] = BODY_REF_SENTINEL; // legacy alias (pre-r077 label)
  if (!(CONLANG_REF_LABEL in byName)) byName[CONLANG_REF_LABEL] = SYNTH_TPL_CONLANG;
  NODE_SOURCE_REGISTRY.forEach(src => {
    if (allSources && !(src.name in byName)) byName[src.name] = src.id;
    if (!nameById.has(src.id)) nameById.set(src.id, src.name);
  });
  return { byName, nameById };
};

// Resolve refTemplate (name) to actual template id at load time
const resolveTemplateRefs = (templates) => {
  const { byName, nameById } = refTargetIndex(templates);
  // v1.7 r002: an id that points at a template or a registered source survives
  // re-resolution (the multi-template branch of fix()).
  const liveTargetIds = new Set(nameById.keys());
  const fix = (field, ownTemplate) => {
    // Legacy single-template ref: refTemplate (name) → refTemplateId (instance id).
    if (field.type === "entry-ref" && field.refTemplate && !field.refTemplateId) {
      field.refTemplateId = byName[field.refTemplate] || null;
    }
    // v1.3: multi-template ref: refTemplates (array of names) → refTemplatesId
    // (array of instance ids). Dropped entries where the template doesn't exist.
    // v1.7 r002: an id that still resolves is never dropped here. Rebuilding the
    // ids from the names alone took away a target the template builder had
    // added (it saved ids without names), and migrate()'s cleanup then deleted
    // every reference to it. Kept ids stay in their order; the names add
    // whatever they resolve to.
    if (field.type === "entry-ref" && Array.isArray(field.refTemplates)) {
      const kept = (Array.isArray(field.refTemplatesId) ? field.refTemplatesId : []).filter(id => liveTargetIds.has(id));
      const fromNames = field.refTemplates.map(n => byName[n]).filter(Boolean);
      field.refTemplatesId = [...new Set([...kept, ...fromNames])];
    }
    // v1.3: refFilters fieldLabel → fieldId resolution per target template.
    // Built-in templates declare filters by field label (since field IDs are
    // randomly suffixed per world). This resolves to actual ids in this world.
    // If the target template doesn't exist or its field can't be found, the
    // filter is left unresolved; runtime falls back to "no filter" for that
    // template (logs a warning).
    if (field.type === "entry-ref" && field.refFilters) {
      for (const tplName of Object.keys(field.refFilters)) {
        const filter = field.refFilters[tplName];
        if (!filter) continue;
        if (filter.fieldLabel && !filter.fieldId) {
          const targetTpl = templates.find(t => t.name === tplName);
          if (targetTpl && Array.isArray(targetTpl.fields)) {
            const targetField = targetTpl.fields.find(
              ff => (ff.label || "").toLowerCase() === filter.fieldLabel.toLowerCase()
            );
            if (targetField) filter.fieldId = targetField.id;
          }
        }
      }
    }
    // v1.3: same-template cascade-parent reference. Built-in template definitions
    // declare dependsOn by label since the parent field's ID is generated at
    // instantiation time. Resolve to the actual field id within the owning template.
    if (field.type === "select" && field.dependsOnLabel && !field.dependsOn) {
      if (ownTemplate && Array.isArray(ownTemplate.fields)) {
        const parentField = ownTemplate.fields.find(
          ff => (ff.label || "").toLowerCase() === field.dependsOnLabel.toLowerCase()
        );
        if (parentField) field.dependsOn = parentField.id;
      }
    }
    // v1.3: showWhen conditional-visibility reference. Schema:
    //   showWhen: { fieldLabel: "<parent label>", values: ["A", "B"] }
    // Resolves fieldLabel → fieldId within the owning template. If the parent
    // can't be found, showWhen.fieldId stays unset and isFieldVisible fails-open
    // (the field stays visible) to avoid silently hiding data on misconfig.
    if (field.showWhen && field.showWhen.fieldLabel && !field.showWhen.fieldId) {
      if (ownTemplate && Array.isArray(ownTemplate.fields)) {
        const parentField = ownTemplate.fields.find(
          ff => (ff.label || "").toLowerCase() === field.showWhen.fieldLabel.toLowerCase()
        );
        if (parentField) field.showWhen.fieldId = parentField.id;
      }
    }
    if (field.type === "group" && field.subfields) field.subfields.forEach(f => fix(f, ownTemplate));
    return field;
  };
  templates.forEach(t => t.fields.forEach(f => fix(f, t)));
};

// v1.7 r002: a reference field's target names follow its target ids, so that
// resolving the names again changes nothing. The template builder edits ids
// and used to leave the names behind; resolveTemplateRefs then undid its
// edits whenever it ran: a removed target came back, a field cleared to take
// any template narrowed again, one switched back to a single target turned
// multi-target again, and the target hint on the field's label (refHintFor,
// which reads names first) went stale. (An added target dropped out, taking
// the references to it along; resolveTemplateRefs now keeps any id that still
// resolves.) saveTemplate runs this on the template being saved; migrate()
// runs it once per world on every template. `templates` is the whole list,
// for resolving names; `only`, when given, is the templates to change;
// `legacy` resolves names as resolveTemplateRefs did before r002, to judge ids
// it derived then (migrate()'s pass).
//
// Per entry-ref field, group subfields included:
//   - A field holding an id that resolves to nothing (a deleted template, say)
//     is left alone. migrate() mends one the v1.5 conversions retired, just
//     after its own call here (v1.7 r004).
//   - Multi-target (a non-empty id list): a name whose target is listed keeps
//     its place; a name whose target isn't listed goes; a name that resolves
//     to nothing stays, so a restored built-in is targeted again; a listed
//     target without a name gets one at the end. A field with no name list
//     keeps ids only. A single-target name or id left from before the field
//     went multi-target goes: nothing reads it but the stale hint.
//   - Cleared (an empty id list): the names go if any of them resolves.
//   - Switched back to a single target (the id list and refFilters both null,
//     as the builder's toggle leaves them): the names go. An id list that's
//     null without that is left from the v1.5 Language / Glossary supersede,
//     and stays for migrate() to mend (v1.7 r004).
//   - Single target: the name follows the id. Set to any template (the id
//     null), a name that resolves goes and one that doesn't stays. A name
//     with no id at all hasn't been resolved yet, and stays.
const syncRefTargetNames = (templates, only, legacy) => {
  const { byName, nameById } = refTargetIndex(templates, !legacy);
  const sync = (f) => {
    if (!f || typeof f !== "object") return;
    if (f.type === "group" && Array.isArray(f.subfields)) f.subfields.forEach(sync);
    if (f.type !== "entry-ref") return;
    const ids = Array.isArray(f.refTemplatesId) ? f.refTemplatesId : null;
    if (ids && ids.some(id => !nameById.has(id))) return;
    if (f.refTemplateId && !nameById.has(f.refTemplateId)) return;
    const names = Array.isArray(f.refTemplates) ? f.refTemplates : null;
    if (ids && ids.length > 0) {
      if (names) {
        const listed = new Set(ids);
        const named = new Set();
        const next = [];
        names.forEach(n => {
          const id = byName[n];
          if (id === undefined) next.push(n);
          else if (listed.has(id) && !named.has(id)) { next.push(n); named.add(id); }
        });
        ids.forEach(id => { if (!named.has(id)) { next.push(nameById.get(id)); named.add(id); } });
        f.refTemplates = next;
      }
      if ("refTemplate" in f) delete f.refTemplate;
      if (f.refTemplateId) f.refTemplateId = null;
      return;
    }
    if (ids) {
      if (names && names.some(n => byName[n] !== undefined)) f.refTemplates = [];
    } else if (names && f.refTemplatesId === null && f.refFilters === null) {
      delete f.refTemplates;
    }
    if (f.refTemplate) {
      if (f.refTemplateId) {
        if (byName[f.refTemplate] !== f.refTemplateId) f.refTemplate = nameById.get(f.refTemplateId);
      } else if (f.refTemplateId === null && byName[f.refTemplate] !== undefined) {
        delete f.refTemplate;
      }
    }
  };
  (only || templates).forEach(t => { if (t && Array.isArray(t.fields)) t.fields.forEach(sync); });
};

// v1.7 r039: the template's id is new to takenTemplateIds, and each field's to
// takenFieldIds and the fields made before it (freshNameId); both optional.
const makeTemplateFromBuiltin = (bt, takenTemplateIds, takenFieldIds) => {
  const fieldIds = new Set(takenFieldIds instanceof Set ? takenFieldIds : []);
  return {
    id: freshNameId("tpl", bt.name, takenTemplateIds),
    name: bt.name,
    icon: bt.icon,
    color: bt.color,
    kind: bt.kind || "standard",
    origin: TEMPLATE_ORIGIN.BUILTIN,
    // v1.7 r016: Plot Thread and Theme / Motif belong to Fabula, which finds
    // them by this flag (docs/fabula-spec.md, section 4).
    ...(bt.fabulaRole ? { fabulaRole: bt.fabulaRole } : {}),
    fields: bt.fields.map(f => {
      const id = freshNameId("fld", f.label, fieldIds);
      fieldIds.add(id);
      return { id, ...f };
    }),
  };
};

const seedBuiltinTemplates = () => {
  const taken = new Set();
  const tmpls = BUILTIN_TEMPLATES.map(bt => {
    const t = makeTemplateFromBuiltin(bt, taken);
    taken.add(t.id);
    return t;
  });
  resolveTemplateRefs(tmpls);
  return tmpls;
};
