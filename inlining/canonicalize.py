"""
Canonical form for the modularization reconstitution-parity gate (plan section 6).

The end-step gate proves: assemble(module tree) reconstitutes the reference body
with no substantive change. "Substantive" = anything a JS engine can observe.
Blank lines and trailing whitespace are not observable, so the normal form drops
them; everything else is compared in source order.

Two comparison strengths are exposed because two different operations need them:

  canonical_sequence(text)  -> the ordered list of non-blank, trailing-trimmed
                               lines. Position-sensitive. This is the gate for a
                               PURE SPLIT, where order is preserved by construction:
                               any reordering, addition, or deletion of code shows.

  canonical_multiset(text)  -> Counter of those same lines, order-independent. This
                               is the gate for a RELOCATION/gather (the r002/r003
                               operation), where lines move on purpose and the claim
                               is only that nothing was added, dropped, or altered.
                               A relocation that passes the multiset check still owes
                               a by-hand eval-order argument; the parser cannot catch
                               a TDZ break and neither can this.

decl_names(text) is the independent 419-name invariant: the set of top-level
declaration names. A split or relocation must leave it untouched.

This module decides the normal form ONCE. Do not normalize join points ad hoc in
the build script; route every parity check through here so the signal is the same
every time (the gate dies the day it starts drowning in whitespace noise).
"""

import re
from collections import Counter

_DECL = re.compile(r'^(?:const|let|var|function|class|async function)\s+([A-Za-z0-9_$]+)')

# --- header_pairs support (r025) --------------------------------------------
#
# A SECTION HEADER is a column-0 `//` comment whose text is set off by dashes.
# ONE rule, stated here and nowhere else, because the baseline count is only
# meaningful if it is derived from a single definition:
#
#   a LEADING run of two or more dash characters (U+2500 or ASCII '-'),
#   OR a trailing-only run of EIGHT or more.
#
# Two floors, both earned. The leading minimum is TWO, not three: a three-dash
# minimum drops `// -- Node-source registry (v1.5 r075) ---...`, which is a real
# column-0 header sitting one line past the stemma boundary blank, i.e. exactly
# the seam a stemma carve reads for evidence. The trailing floor is EIGHT: it
# separates a fill rule from sentence punctuation, and below it nine prose lines
# in 17_glossopoeia/ that terminate blocks with ' ---' get swept in as headers.
#
# COLUMN 0 ONLY, deliberately. Under this rule the tree also holds 35 INDENTED
# dash-set comments, and they are excluded because pairing them with the next
# TOP-LEVEL declaration is meaningless by construction: an indented header sits
# inside a function body, so its "next declaration" is whatever follows the
# enclosing function, often hundreds of lines away. That pair is wrong from the
# start and churns whenever the enclosing function moves. Including them costs
# nothing on a pure split (byte-identity already sees any header that moved) and
# buys 35 permanently-wrong rows in the one list this check exists to keep
# readable. The same reasoning that struck `10_migrate` "Marked configuration"
# from the shear census applies here at scale.
_DASH = r'[\u2500\-]'
_HDR_LEAD = re.compile(r'^//[ \t]*' + _DASH + r'{2,}')
_HDR_TRAIL = re.compile(_DASH + r'{8,}[ \t]*$')
_HDR_STRIP_L = re.compile(r'^[\s\u2500\-]+')
_HDR_STRIP_R = re.compile(r'[\s\u2500\-]+$')

# A header may label a CALL BLOCK rather than a declaration. `10_migrate`
# "Marked configuration" correctly heads `marked.use({...})`, which is a call
# expression. A declaration-only pair function reports it as a shear forever: a
# permanent false positive in the baseline, in a module the header does not
# belong to. Recognised here rather than allowlisted, because an allowlist is a
# hardcoded exception that goes stale the moment the block moves.
_CALL = re.compile(r'^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(')
_CALL_KEYWORDS = frozenset({
    'if', 'for', 'while', 'switch', 'catch', 'do', 'with', 'return', 'typeof',
    'function', 'new', 'delete', 'void', 'throw', 'await', 'yield',
})


def _is_header(line):
    if not line.startswith('//'):
        return False
    return bool(_HDR_LEAD.match(line) or _HDR_TRAIL.search(line))


def _header_title(line):
    s = _HDR_STRIP_L.sub('', line[2:])
    return _HDR_STRIP_R.sub('', s).strip()


def _normalized_lines(text):
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    out = []
    for line in text.split('\n'):
        line = line.rstrip()
        if line:
            out.append(line)
    return out


def canonical_sequence(text):
    """Ordered non-blank, trailing-trimmed lines. Position-sensitive."""
    return _normalized_lines(text)


def canonical_text(text):
    """canonical_sequence joined back to a string, for diffing/display."""
    return '\n'.join(_normalized_lines(text))


def canonical_multiset(text):
    """Counter of non-blank, trailing-trimmed lines. Order-independent."""
    return Counter(_normalized_lines(text))


def decl_names(text):
    """Set of top-level (column-0) declaration names."""
    names = set()
    for line in text.split('\n'):
        m = _DECL.match(line)
        if m:
            names.add(m.group(1))
    return names


def header_pairs(text):
    """
    Ordered list of (header title, target name) for every column-0 section
    header, where target is the first following top-level declaration OR
    column-0 call block, or None if the text runs out first.

    This is the FOURTH invariant, and it is the only one that can see a SHEARED
    header: a header left behind when the block it labels was relocated. A shear
    is invisible to canonical sequence (the line is still present), invisible to
    multiset (same line, different position), and invisible to byte-identity on a
    gather (bytes are supposed to move). Twelve of them accumulated silently
    before anything was watching.

    Scanning does not stop at an intervening header, so two stacked headers pair
    with the same target. That is deliberate: a repeated target is how a bare
    orphan shows up.

    The title is the dash-stripped text, not the raw line, so a change in fill
    width is not a diff. Width changes on a pure split are caught by
    byte-identity anyway.
    """
    lines = text.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    n = len(lines)
    out = []
    for i, line in enumerate(lines):
        if not _is_header(line):
            continue
        target = None
        for j in range(i + 1, n):
            nxt = lines[j]
            m = _DECL.match(nxt)
            if m:
                target = m.group(1)
                break
            m = _CALL.match(nxt)
            if m and m.group(1).split('.')[0] not in _CALL_KEYWORDS:
                target = m.group(1)
                break
        out.append((_header_title(line), target))
    return out


def header_pair_diff(assembled, reference):
    """
    (added, removed, retargeted) between two pair lists.

    retargeted is [(title, ref_target, asm_target)] for a title whose target
    changed, which is the shear signature: the header stayed, its block left.
    Compared as multisets so a duplicated title cannot mask a change.
    """
    a = Counter(header_pairs(assembled))
    r = Counter(header_pairs(reference))
    added = sorted((a - r).elements())
    removed = sorted((r - a).elements())
    a_titles = Counter(t for t, _ in added)
    r_titles = Counter(t for t, _ in removed)
    shared = set(a_titles) & set(r_titles)
    retargeted = sorted(
        (t, rt, at)
        for t in shared
        for at in {x for tt, x in added if tt == t}
        for rt in {x for tt, x in removed if tt == t}
    )
    added = [p for p in added if p[0] not in shared]
    removed = [p for p in removed if p[0] not in shared]
    return added, removed, retargeted


def first_difference(assembled, reference):
    """
    Position-sensitive comparison of two canonical sequences. Returns None if
    identical, else (index, assembled_line_or_None, reference_line_or_None) for
    the first line that differs. index is 1-based into the canonical sequence.
    """
    a = canonical_sequence(assembled)
    b = canonical_sequence(reference)
    for i in range(min(len(a), len(b))):
        if a[i] != b[i]:
            return (i + 1, a[i], b[i])
    if len(a) != len(b):
        i = min(len(a), len(b))
        return (i + 1,
                a[i] if i < len(a) else None,
                b[i] if i < len(b) else None)
    return None
