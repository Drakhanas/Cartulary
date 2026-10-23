"""r051: the map font comes from the file itself; the application makes no
network request, ever (release prep; Drak's call, 2026-10-23).

r037's download embedded Cormorant Garamond in a downloaded svg by fetching
the Google Fonts stylesheet and the latin woff2 it named, once per session,
falling back to the viewer's serif offline. That was the one network request
in the application, and it contradicted the page's and the site's standing
claim that the file needs no network at all. The claim is the spec; the
fetch goes.

The release build already carries Cormorant Garamond 400 as a data-URL
@font-face in an inline <style> (build_inline.py, FONT_FACES). The download
now copies that rule out of the page's own stylesheet and writes it into the
svg as it stands. Nothing is fetched. In the development build, whose head
loads the fonts from a stylesheet link, there is no inline rule, the result
is null, and the file falls back silently, as before; the release build is
the one the claim is about, and the probe runs against both.

Declared scope: 18_cartographia/03_view.jsx (the function, its caller, the
builder's comment), 26_home-data (one clause of the help), and
site/helloworld.html outside the tree (one clause). No declaration added or
removed: mapFontFaceCss keeps its name.

String-anchored edits; every anchor must occur exactly once. Run from the
repository root:  python3 inlining/cuts/r051_font_inline.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VIEW = ROOT / "cartulary-src/modules/18_cartographia/03_view.jsx"
HELP = ROOT / "cartulary-src/modules/26_home-data.jsx"
SITE = ROOT / "site/helloworld.html"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        n = text.count(old)
        assert n == 1, f"{path.name}: anchor occurs {n} times, not once:\n{old[:160]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


OLD_FUNCTION = """// The map font for a downloaded file. An svg opened on its own, or loaded as
// an image to be drawn to a canvas, is a sealed document: it cannot see the
// page's web fonts, so a label would fall back to the viewer's serif. The
// download embeds Cormorant Garamond instead: the Google Fonts stylesheet
// names the latin woff2, which is fetched and written in as a data URL. One
// fetch per session, cached on the function; offline, or on any failure,
// null, and the file falls back silently.
function mapFontFaceCss() {
  if (!mapFontFaceCss.promise) {
    mapFontFaceCss.promise = (async () => {
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 8000);
        const css = await (await fetch("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400&display=swap", { signal: ctl.signal })).text();
        const blocks = css.match(/@font-face\\s*\\{[^}]*\\}/g) || [];
        const latin = blocks.find(b => /unicode-range:\\s*U\\+0000-00FF/i.test(b)) || blocks[0];
        const m = latin ? /url\\((https:[^)\\s"']+\\.woff2)\\)/.exec(latin) : null;
        if (!m) throw new Error("no woff2 url");
        const bytes = new Uint8Array(await (await fetch(m[1], { signal: ctl.signal })).arrayBuffer());
        clearTimeout(timer);
        let bin = "";
        for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
        return `@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2');}`;
      } catch (err) {
        return null;
      }
    })();
  }
  return mapFontFaceCss.promise;
}
"""

NEW_FUNCTION = """// The map font for a downloaded file. An svg opened on its own, or loaded as
// an image to be drawn to a canvas, is a sealed document: it cannot see the
// page's web fonts, so a label would fall back to the viewer's serif. The
// download embeds Cormorant Garamond instead, copied from the page's own
// stylesheet: the release build inlines every font it uses as a data-URL
// @font-face, and the regular-weight rule is written into the file as it
// stands. Nothing is fetched; the application makes no network request
// (r051). Found once per session, cached on the function. A build whose
// fonts come from a stylesheet link (the development head) has no inline
// rule; the result is null and the file falls back silently.
function mapFontFaceCss() {
  if (mapFontFaceCss.css === undefined) {
    let found = null;
    try {
      const css = Array.from(document.querySelectorAll("style")).map(s => s.textContent || "").join("\\n");
      const blocks = css.match(/@font-face\\s*\\{[^}]*\\}/g) || [];
      found = blocks.find(b =>
        /font-family:\\s*['"]?Cormorant Garamond['"]?\\s*;/i.test(b)
        && /font-weight:\\s*(400|normal)\\s*[;}]/i.test(b)
        && !/font-style:\\s*italic/i.test(b)
        && /src:\\s*url\\(["']?data:/i.test(b)) || null;
    } catch (err) {
      found = null;
    }
    mapFontFaceCss.css = found;
  }
  return mapFontFaceCss.css;
}
"""

VIEW_EDITS = [
    (OLD_FUNCTION, NEW_FUNCTION),
    ("// data with their own renderer), the map font embedded when it can be\n"
     "// fetched, href doubled as xlink:href on image, use, and textPath so older\n",
     "// data with their own renderer), the map font embedded from the page's own\n"
     "// stylesheet, href doubled as xlink:href on image, use, and textPath so older\n"),
    ("  const fontCss = await mapFontFaceCss();\n",
     "  const fontCss = mapFontFaceCss();\n"),
]

HELP_EDITS = [
    ("hidden layers left out, the map font embedded when it can be fetched, and no pins (pins are app data with their own renderer).",
     "hidden layers left out, the map font embedded, and no pins (pins are app data with their own renderer)."),
]

SITE_EDITS = [
    ("hidden layers left out, the map font embedded when it can be fetched (so labels keep their face when the file is opened elsewhere; offline, the viewer's serif stands in), and no pins.",
     "hidden layers left out, the map font embedded from the file's own copy (so labels keep their face when the file is opened elsewhere), and no pins."),
]


def main():
    edit(VIEW, VIEW_EDITS)
    edit(HELP, HELP_EDITS)
    edit(SITE, SITE_EDITS)
    view = VIEW.read_text(encoding="utf-8")
    assert "fetch(" not in view.split("function buildMapDownloadSvg")[0].split("function mapFontFaceCss")[1], "the function still fetches"
    assert "googleapis" not in view, "a Google Fonts URL remains in the view"
    for p in (VIEW, HELP, SITE):
        assert "—" not in "".join(n for _, n in VIEW_EDITS + HELP_EDITS + SITE_EDITS), "an em dash in the cut's text"
    print("r051 applied: 18_cartographia/03_view (mapFontFaceCss reads the page's inline @font-face; the caller and the builder's comment), 26_home-data (one clause), site/helloworld.html (one clause)")


if __name__ == "__main__":
    main()
