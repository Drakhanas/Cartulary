# Cartulary v1.6 - Nova Totius Terrarum Orbis Geographica

## Hic sunt dracones: Here be dragons

"Here be dragons" is on one globe. The Hunt-Lenox Globe, made around 1510 and about the size of a grapefruit, has HC SVNT DRACONES engraved off the east coast of Asia. One other object carries the words, an ostrich egg that was probably the globe's model. Every other story about mapmakers writing it across the unexplored parts of the world turns out to be someone remembering a map that doesn't exist. The blank parts of old maps were mostly just blank.

In Cartulary, a map has been an image you brought from somewhere else, with pins on it. If you didn't have the image, you had the blank. v1.6 is the release where the blank is a canvas. You draw the coast, paint the forest, stamp the city, run a label along the river, and put the dragons wherever you want them.

The title is borrowed from the world maps the Dutch engraved in the 1600s: a new geography of the whole world, and of the seas, if you read the long version. v1.6 makes a smaller claim. A new geography of yours.

One big thing (a map editor), one change underneath (maps are their own records now), one invisible thing (the source is a module tree and the repository is public), and the usual smaller things.

### The map editor

A map used to be an image with pins. That's fine if you have the image. Most worldbuilders don't, or have one that's five revisions behind the world, and making a new one meant a separate application, an export, a reimport, and a map that was out of date again by the time the pins were back on it.

Open + New Map in Cartographia, or Edit on any map you already have, and you get a canvas: an image you bring, a blank vellum sheet, or both. Rect, Ellipse, Polygon, Line, Freehand, Fill, Text, Stamp, Brush, Eraser, Pan; Pin is still the default. A palette of eight, line widths, Smooth for rounded corners and curved lines. Labels take an angle and an arc, so a name can follow a coastline or ring a city. Select moves, reshapes, turns, and nudges. Layers are a named stack with show, hide, and lock, and a hidden layer stays out of the exports too.

Undo and redo, fifty steps, one per gesture, pins included. This is the first undo anywhere in Cartulary. It covers the map editor while you're in it; Version History remains the safety net for everything else.

### Painting

Brush and Eraser paint on raster layers. With a drawing layer active, the first stroke makes a Paint layer just above it, so you don't have to think about the stack until you want to. A hard round and a soft round come built in. Load image fills a raster layer with a PNG, JPEG, or WebP scaled to the canvas, which is how a scan or a painting made elsewhere gets under your drawing. With an image folder connected, each painted layer is a file in the folder; without one, it embeds in the save. Mouse, pen, or finger. A pen's eraser end erases. Pressure isn't read; a stroke is the size you set.

### Stamps and brush packs

Four symbols are built in (mountain, tree, settlement, compass rose). The rest come from packs, and the point of the packs is that the ones you already own work. Brushes import as tips from PNG files or a zip of them (a Wonderdraft folder's names and tint modes are read), from Photoshop .abr, from GIMP .gbr and .gih, and from Procreate .brush and .brushset. A tip with no color is tinted by the map's fill; one with color is placed as it is. A Cartulary pack is a .json of SVG symbols, PNG tips, or both; every SVG body is sanitized on import and again on every load, and the import shows you what it removed before anything lands. Packs export as JSON, or as PNGs in the Wonderdraft folder layout that Inkarnate and Dungeondraft also take.

### Maps are their own records

Since v1.0, a map was an entry of a Map template with a special kind, hidden from the sidebar since v1.4 and reached through Cartographia's front door. That was a hack with a long tail: a map kind in the Template Builder nobody should have picked, exports that treated maps as entries. A map is now a record in Cartographia: Description, Scope / Region, Notes, its canvas, and its pins. There is no Map template and no map kind. Concordance shows maps as their own toggleable type, and a pin that links to an entry is an edge from the map to it, as before.

Worlds saved by v1.5 migrate on load. Every map entry becomes a map record with its image and its pins where they were and the drawing empty. Any extra field a custom map template had is kept in the record with a line in Notes naming it. The save file is still plain JSON you can read.

### Getting a map out

Download SVG or PNG from a map's view: the drawing with the image and the painted layers inlined, stamps resolved, hidden layers out, the map font embedded. PNG is drawn at twice the canvas size. The world's HTML export renders every map through the same renderer, and the Markdown + images zip carries the painted layers beside the map images.

### And more

Ctrl+scroll, pinch, or the corner bar to zoom; the Pan tool, Space, the middle button, or two fingers to pan. The tool strip is built from groups that dim rather than disappear when they don't apply, so nothing moves under the pointer; Arrange reorders them however you like, every tool has a letter, and every swatch carries its name for a screen reader. The in-app help has three map topics now and a corrected JSON schema, and eight other topics were read against the application and fixed where they'd drifted. cartulary.world's Cartographia page is a hub with sub-pages for the editor and for stamps and brushes.

### Under the hood

Cartulary is still one HTML file and behaves the same whether you open v1.5 or v1.6. What changed is how the file is made. The source that used to be one 39,000-line script is a tree of 44 module files now, one per view or subsystem (the map editor is five of them), that a build assembles into the file you download. Every change is checked twice before it ships: the assembled file has to parse, and a pure reorganization has to reassemble byte for byte against a frozen reference. None of this is visible in the application. It's what made a feature the size of the map editor buildable without touching the rest.

It's also the shape the repository has, and the repository is public now. github.com/Drakhanas/Cartulary holds the module tree, the build, the gates that check it, and the project's own working documents. The Readable build still ships beside the compiled one with the JSX intact. Bug reports can be filed as GitHub issues, alongside the page comments and the Discord.

### Dracones

Nobody knows why the engraver put dragons off the coast of Asia. Probably because nobody had told him what was there and the space wanted something. That's the condition of every fictional map: the parts you haven't drawn aren't empty, they're undecided. v1.6 doesn't decide them for you. It puts the pen inside the tool, next to the entries the places belong to, so that when you do decide, the map is where the rest of the world already lives.

Full documentation at cartulary.world. The in-app Home docs (◐ Home in the sidebar) are the canonical usage reference.

Mind the dragons.
