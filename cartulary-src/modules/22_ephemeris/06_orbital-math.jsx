
// Tiny display helper for numeric AsBo field values. Renders "—" for
// null / undefined / non-finite, formats finite values to 4 significant
// digits, appends an optional unit string.
const fmtNum = (val, unit) => {
  if (val == null || !Number.isFinite(val)) return "—";
  const abs = Math.abs(val);
  let str;
  if (abs >= 1000 || (abs > 0 && abs < 0.01)) {
    str = val.toExponential(3);
  } else {
    str = Number(val.toFixed(4)).toString();
  }
  return unit ? `${str} ${unit}` : str;
};

// ─── Orbital math helpers (v1.5 r008) ────────────────────────────────────────
//
// Unit conventions per AB.9 (locked):
//   - mass        in M⊕ (Earth masses)         — Sun ≈ 332946 M⊕
//   - radius      in R⊕ (Earth radii)
//   - semi-major  in AU
//   - angles      in degrees
//   - period      in days (auto-scales to years past ~2 yr)
//
// v1.5 storage is canonical (one unit per quantity, no per-field overrides).
// User-selectable units are a v1.6+ candidate.

const M_SUN_IN_EARTHS = 332946;
const DAYS_PER_YEAR = 365.25;

// Kepler's third law in heliocentric units: T² = a³ / M (T in years, a in
// AU, M in solar masses). With parent mass given in M⊕, convert to M_sun
// first. Returns period in days, or null when either input is missing or
// non-positive. The body's own mass is ignored — for worldbuilder-scale
// systems (moon mass << parent mass) the two-body reduced-mass correction
// is below display precision, and including it would force a recompute
// chain when the body's own mass edits.
const computeOrbitalPeriodDays = (semiMajorAxisAU, parentMassEarths) => {
  if (!Number.isFinite(semiMajorAxisAU) || semiMajorAxisAU <= 0) return null;
  if (!Number.isFinite(parentMassEarths) || parentMassEarths <= 0) return null;
  const M_solar = parentMassEarths / M_SUN_IN_EARTHS;
  const T_years = Math.sqrt(Math.pow(semiMajorAxisAU, 3) / M_solar);
  return T_years * DAYS_PER_YEAR;
};

// Display formatter for orbital periods. Picks days for short periods,
// years past ~2 years (730 days). Matches AB.9's "auto-scale period
// display" affordance. Returns "—" for missing/invalid input so callers
// don't need to guard separately.
const formatOrbitalPeriod = (periodDays) => {
  if (!Number.isFinite(periodDays) || periodDays <= 0) return "—";
  if (periodDays >= 730) {
    const years = periodDays / DAYS_PER_YEAR;
    return `${Number(years.toFixed(2))} years`;
  }
  return `${Number(periodDays.toFixed(2))} days`;
};

// Surface gravity in Earth-g units. With M in M⊕ and R in R⊕, g_local /
// g_Earth = M / R² — a clean dimensionless ratio that drops the universal
// gravitational constant and Earth's surface-g out of the math. Returns
// null when either input is missing or non-positive. The doctrine's "Earth
// gravity = 1" convention makes this directly readable as a worldbuilder
// quantity (Mars ≈ 0.38g, Jupiter ≈ 2.5g surface).
const computeSurfaceGravity = (massEarths, radiusEarths) => {
  if (!Number.isFinite(massEarths) || massEarths <= 0) return null;
  if (!Number.isFinite(radiusEarths) || radiusEarths <= 0) return null;
  return massEarths / (radiusEarths * radiusEarths);
};

// Perihelion / aphelion distances from semi-major axis + eccentricity.
// q = a(1-e), Q = a(1+e). Returned in the same unit as the input axis
// (AU for our convention). Returns null for invalid input. Eccentricity
// is clamped to [0, 0.99] defensively in case a stored value drifted past
// the editor's slider cap.
const computeApsides = (semiMajorAxis, eccentricity) => {
  if (!Number.isFinite(semiMajorAxis) || semiMajorAxis <= 0) return null;
  const e = Number.isFinite(eccentricity) ? Math.max(0, Math.min(0.99, eccentricity)) : 0;
  return {
    perihelion: semiMajorAxis * (1 - e),
    aphelion:   semiMajorAxis * (1 + e),
  };
};

// ─── Secondary derived helpers (r009) ────────────────────────────────────────
//
// AB.6 splits derived values into primary (inline beside source blocks)
// and secondary (in a collapsible panel). Primary derivations landed in
// r008 — orbital period, apsides, surface gravity. Secondary derivations
// land here in r009: escape velocity, Schwarzschild radius (black holes),
// Hill sphere, habitable zone (stars), synodic periods (against siblings).
//
// Plus tidal lock detection, which lives in the Orbital block's existing
// inline Derived section because tidal locking is most meaningful next to
// rotation/orbital period — the relationship that defines it.

// Escape velocity in km/s. v_esc = sqrt(2GM/R). Pre-collapsed constants:
// for M in M⊕ and R in R⊕, v_esc = sqrt(2 G M_⊕ / R_⊕) × sqrt(M/R) =
// 11.186 km/s × sqrt(M/R). Earth (M=1, R=1) returns 11.186 km/s, matching
// the standard textbook value.
const computeEscapeVelocityKmS = (massEarths, radiusEarths) => {
  if (!Number.isFinite(massEarths) || massEarths <= 0) return null;
  if (!Number.isFinite(radiusEarths) || radiusEarths <= 0) return null;
  return 11.186 * Math.sqrt(massEarths / radiusEarths);
};

// Schwarzschild radius in km. r_s = 2GM/c². With M in M⊕:
// r_s_m = 2 × 6.674e-11 × 5.972e24 / (2.998e8)² × M = 0.008866 m × M.
// In km: 8.866e-6 × M⊕. Only meaningful for kind="black-hole" — for any
// other body, r_s is far inside the physical radius (Earth's is 8.87 mm).
// Display layer gates this on kind; the helper itself just computes it.
const computeSchwarzschildRadiusKm = (massEarths) => {
  if (!Number.isFinite(massEarths) || massEarths <= 0) return null;
  return 8.866e-6 * massEarths;
};

// Hill sphere radius — region where the body's gravity dominates over
// the parent's. r_H ≈ a × (m / 3M)^(1/3). All masses in M⊕ (cancels in
// the ratio). Returned in same unit as semi-major axis (AU). Earth (a=1,
// m=1, M_sun=332946) returns ≈ 0.01 AU ≈ 1.5M km, matching reference.
const computeHillSphereAU = (semiMajorAxisAU, bodyMassEarths, parentMassEarths) => {
  if (!Number.isFinite(semiMajorAxisAU) || semiMajorAxisAU <= 0) return null;
  if (!Number.isFinite(bodyMassEarths) || bodyMassEarths <= 0) return null;
  if (!Number.isFinite(parentMassEarths) || parentMassEarths <= 0) return null;
  return semiMajorAxisAU * Math.cbrt(bodyMassEarths / (3 * parentMassEarths));
};

// Synodic period between two bodies sharing a parent — how often the
// faster body laps the slower as seen from the parent. 1/T_syn = |1/T₁ -
// 1/T₂|. Returns Infinity for identical periods (bodies never lap); null
// for missing or non-positive inputs.
const computeSynodicPeriodDays = (period1Days, period2Days) => {
  if (!Number.isFinite(period1Days) || period1Days <= 0) return null;
  if (!Number.isFinite(period2Days) || period2Days <= 0) return null;
  if (period1Days === period2Days) return Infinity;
  return 1 / Math.abs(1 / period1Days - 1 / period2Days);
};

// Habitable zone bounds for a star. Three models, in order of precedence:
//
// 1. MANUAL — `pp.hzModel === "manual"` reveals `pp.hzInnerAU` / `pp.hzOuterAU`
//    as direct bounds. Bypasses physics entirely; for non-physical settings
//    or when the user wants narrative control.
// 2. OPTIMISTIC — Kasting/Kopparapu (2013) recent-Venus to early-Mars limits:
//    0.75 × √L (inner) to 1.77 × √L (outer). Wider, still published, less
//    aggressive about greenhouse-runaway placement than the conservative bound.
// 3. CONSERVATIVE (default) — Kasting et al. (1993) runaway-greenhouse to
//    maximum-greenhouse limits: 0.95 × √L (inner) to 1.37 × √L (outer).
//    The "this is definitely the HZ" range.
//
// Luminosity: by default derived from stellar mass via main-sequence
// mass-luminosity (L_solar = (M/M_sun)^3.5). If `pp.luminosity` is set
// (in L_solar units), the override wins — covers giants, pre-main-sequence
// stars, and any case where the M-L relation doesn't apply.
//
// Returns null if the inputs can't produce a meaningful zone (no mass and
// no luminosity, manual model with missing/inverted bounds, etc.).
const computeHabitableZoneAU = (pp) => {
  if (!pp || typeof pp !== "object") return null;
  const model = pp.hzModel || "conservative";

  if (model === "manual") {
    const inner = pp.hzInnerAU;
    const outer = pp.hzOuterAU;
    if (!Number.isFinite(inner) || !Number.isFinite(outer)) return null;
    if (inner <= 0 || outer <= inner) return null;
    return { innerAU: inner, outerAU: outer, model: "manual", luminosityOverride: false };
  }

  // Compute luminosity in solar units, override-or-derive.
  let L_solar;
  let luminosityOverride = false;
  if (Number.isFinite(pp.luminosity) && pp.luminosity > 0) {
    L_solar = pp.luminosity;
    luminosityOverride = true;
  } else {
    if (!Number.isFinite(pp.mass) || pp.mass <= 0) return null;
    const M_solar = pp.mass / M_SUN_IN_EARTHS;
    L_solar = Math.pow(M_solar, 3.5);
  }

  const sqrtL = Math.sqrt(L_solar);
  const coeffs = model === "optimistic"
    ? { inner: 0.75, outer: 1.77 }
    : { inner: 0.95, outer: 1.37 };
  return {
    innerAU: coeffs.inner * sqrtL,
    outerAU: coeffs.outer * sqrtL,
    model,
    luminosityUsed: L_solar,
    luminosityOverride,
  };
};

// Tidal lock detection. Body is tidally locked when its rotation period
// equals its orbital period (1:1 spin-orbit resonance). Tolerance: 1%
// relative difference. Returns:
//   "locked"  rotation ≈ orbital
//   "free"    rotation diverges from orbital
//   null      either input missing
// Note: 1:1 is the dominant case (Moon, most major moons in the solar
// system). Higher-order resonances like Mercury's 3:2 aren't surfaced —
// caller can read rotation vs orbital periods directly to spot those.
const computeTidalLockStatus = (rotationPeriodDays, orbitalPeriodDays) => {
  if (!Number.isFinite(rotationPeriodDays) || rotationPeriodDays <= 0) return null;
  if (!Number.isFinite(orbitalPeriodDays) || orbitalPeriodDays <= 0) return null;
  const ratio = rotationPeriodDays / orbitalPeriodDays;
  return Math.abs(ratio - 1) <= 0.01 ? "locked" : "free";
};

// ─── Orbital position math (r011) ────────────────────────────────────────────
//
// Full Keplerian 2-body position computation. Used by all non-phase
// alignment types (conjunction in r011, eclipse in r012, nodal in r013)
// and by Observe view's top-down + sky-from-surface renderers (r014+).
// Phase alignment doesn't need real positions — it operates on mean
// anomaly directly.
//
// Pipeline:
//   M(t)  →  E(M, e)  →  ν(E, e)  →  r(a, e, E)  →  position(a, e, ν, ω, i, Ω)
//
// Each step is a separately-exposed helper so the chain can be tested in
// isolation against JPL ephemeris reference values. Reading top-to-bottom
// follows the flow of computation.
//
// Math conventions:
//   - All public-API angles in degrees (convert to radians internally).
//   - Orbital elements per AB.9 doctrine (semi-major axis AU, angles deg).
//   - Inertial frame: x-axis points to vernal equinox of parent's
//     reference frame, z perpendicular to parent's reference plane,
//     y completes right-handed triad.
//   - Eccentricity capped at 0.99 (matches AsBo editor + doctrine —
//     elliptical orbits only, no parabolic/hyperbolic in v1.5).

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Solve Kepler's equation M = E - e·sin(E) for eccentric anomaly E given
// mean anomaly M (degrees) and eccentricity e. Newton-Raphson iteration
// converges quadratically; ~5-10 iters for e < 0.9, ~15-20 for e near
// 0.99. Initial guess E = M is exact for e=0, good for small e.
// Returns E in degrees.
const solveKeplerEquation = (meanAnomalyDeg, eccentricity, opts = {}) => {
  const e = Math.max(0, Math.min(0.99, Number.isFinite(eccentricity) ? eccentricity : 0));
  const M = meanAnomalyDeg * DEG_TO_RAD;
  const tol = opts.tol || 1e-10;
  const maxIter = opts.maxIter || 50;
  let E = M;
  for (let i = 0; i < maxIter; i++) {
    const delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E = E - delta;
    if (Math.abs(delta) < tol) break;
  }
  return E * RAD_TO_DEG;
};

// True anomaly ν from eccentric anomaly E and eccentricity. atan2 form
// handles quadrants correctly. Inputs and output in degrees.
const eccentricToTrueAnomaly = (eccentricAnomalyDeg, eccentricity) => {
  const e = Math.max(0, Math.min(0.99, Number.isFinite(eccentricity) ? eccentricity : 0));
  const E = eccentricAnomalyDeg * DEG_TO_RAD;
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
  return nu * RAD_TO_DEG;
};

// Composition: M → ν directly. For callers that don't need the
// intermediate eccentric anomaly.
const meanToTrueAnomaly = (meanAnomalyDeg, eccentricity) => {
  const E = solveKeplerEquation(meanAnomalyDeg, eccentricity);
  return eccentricToTrueAnomaly(E, eccentricity);
};

// 3D inertial position from the six classical orbital elements. Closed-
// form result of the three-rotation chain (Ω around z, then i around new
// x, then ω around new z, applied to perifocal position).
//
// Vallado §2.6 / Curtis Orbital Mechanics eq 4.34:
//   r = a(1 - e·cos(E))
//   u = ω + ν           (argument of latitude)
//   x = r·(cos(Ω)·cos(u) - sin(Ω)·sin(u)·cos(i))
//   y = r·(sin(Ω)·cos(u) + cos(Ω)·sin(u)·cos(i))
//   z = r·(sin(u)·sin(i))
//
// Returns {x, y, z} in same length unit as semiMajorAxis (AU). Returns
// null for invalid inputs (non-finite axis, e ≥ 1).
const computeOrbitalPosition = (semiMajorAxisAU, eccentricity, meanAnomalyDeg, argumentOfPeriapsisDeg, inclinationDeg, ascendingNodeDeg) => {
  if (!Number.isFinite(semiMajorAxisAU) || semiMajorAxisAU <= 0) return null;
  const e = Math.max(0, Math.min(0.99, Number.isFinite(eccentricity) ? eccentricity : 0));
  const E = solveKeplerEquation(meanAnomalyDeg, e);
  const nu = eccentricToTrueAnomaly(E, e);
  const r = semiMajorAxisAU * (1 - e * Math.cos(E * DEG_TO_RAD));
  const omega = Number.isFinite(argumentOfPeriapsisDeg) ? argumentOfPeriapsisDeg : 0;
  const u = (omega + nu) * DEG_TO_RAD;
  const i = (Number.isFinite(inclinationDeg) ? inclinationDeg : 0) * DEG_TO_RAD;
  const Omega = (Number.isFinite(ascendingNodeDeg) ? ascendingNodeDeg : 0) * DEG_TO_RAD;
  const cosU = Math.cos(u), sinU = Math.sin(u);
  const cosI = Math.cos(i), sinI = Math.sin(i);
  const cosOm = Math.cos(Omega), sinOm = Math.sin(Omega);
  return {
    x: r * (cosOm * cosU - sinOm * sinU * cosI),
    y: r * (sinOm * cosU + cosOm * sinU * cosI),
    z: r * (sinU * sinI),
  };
};

// Body position at time t (absolute days from epoch), relative to its
// immediate parent. Pulls orbital elements from body; advances mean
// anomaly from epoch via M(t) = M_0 + 360°·t/T. Returns {x, y, z} in AU,
// or null if body lacks valid orbital data or parent mass.
const computeBodyPositionAtTime = (body, parentMassEarths, timeDays) => {
  const oe = body?.orbitalElements;
  if (!oe) return null;
  const a = oe.semiMajorAxis;
  const T = computeOrbitalPeriodDays(a, parentMassEarths);
  if (!Number.isFinite(T) || T <= 0) return null;
  const M0 = Number.isFinite(oe.meanAnomalyAtEpoch) ? oe.meanAnomalyAtEpoch : 0;
  const M = ((M0 + 360 * timeDays / T) % 360 + 360) % 360;
  return computeOrbitalPosition(
    a,
    oe.eccentricity,
    M,
    Number.isFinite(oe.argumentOfPeriapsis) ? oe.argumentOfPeriapsis : 0,
    oe.inclination,
    oe.ascendingNode
  );
};

// Body position relative to the system root ancestor at time t. Walks
// up the parent chain, summing parent-relative positions at each level.
// For a top-level body returns origin {0, 0, 0} (the body IS the root).
// For a planet around a star returns the planet's position relative to
// star. For a moon around a planet around a star, returns position =
// planet_around_star + moon_around_planet, summed componentwise.
//
// bodiesById is a map (object) of id → body covering every body in the
// world; needed to walk through the parent chain. Returns null if any
// link in the chain has invalid data (broken parent ref, missing mass,
// missing orbital elements).
const computeRootRelativePosition = (body, timeDays, bodiesById) => {
  if (!body) return null;
  // Collect the chain of bodies from this one up to (but not including)
  // the root. Each entry needs orbital propagation. Bail on cycles.
  const chain = [];
  let cur = body;
  let safety = 0;
  while (cur && cur.parentBodyId) {
    chain.push(cur);
    cur = bodiesById[cur.parentBodyId];
    if (++safety > 100) return null;
  }
  // cur is now the root (parent chain terminated). If null, the chain was
  // broken (missing parent ref); bail.
  if (!cur && chain.length > 0) return null;
  // Sum positions through the chain. Each link's position relative to
  // its parent contributes to the total root-relative position.
  let x = 0, y = 0, z = 0;
  for (const link of chain) {
    const parent = bodiesById[link.parentBodyId];
    const parentMass = parent?.physicalParams?.mass;
    if (!Number.isFinite(parentMass) || parentMass <= 0) return null;
    const pos = computeBodyPositionAtTime(link, parentMass, timeDays);
    if (!pos) return null;
    x += pos.x;
    y += pos.y;
    z += pos.z;
  }
  return { x, y, z };
};

// Angle between two 3D vectors in degrees. acos clamp guards against
// floating-point drift past ±1 from rounding. Returns 0 for zero-length
// vectors (no defined angle).
const angleBetweenVectors = (v1, v2) => {
  if (!v1 || !v2) return 0;
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const m1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const m2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  if (m1 === 0 || m2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (m1 * m2)));
  return Math.acos(cosTheta) * RAD_TO_DEG;
};

// Geometric moon phase (v1.5 moon-unification, step 1). Returns a 5-phase
// glyph index (0..4) computed from real orbital geometry, or null when the
// geometry is unavailable/undefined so the caller can fall back to the
// synodic-cycle formula. Pure: no state, no side effects.
//
// Geometry: phase is the elongation seen from the moon's parent (the planet),
// lit by the system's root star. With the root star at the origin of
// computeRootRelativePosition's frame:
//   planet→star = -planetPos      (star is at origin)
//   planet→moon = moonPos - planetPos
//   elongation  = angle(planet→star, planet→moon)  in [0,180]
// elongation 0   → moon toward the star in the planet's sky → New
// elongation 180 → moon opposite the star               → Full
// Map to fraction = elongation/360 so Full lands at 0.5, then reuse the shared
// fractionToPhaseIndex bucketing (identical glyphs to the cycle path). The
// angle is UNSIGNED (acos, 0..180), which is exactly right because the glyph
// set collapses waxing/waning (BUCKET_TO_PHASE) — there is no side to pick, so
// fraction never needs the [0.5,1) half.
//
// Returns null (→ cycle fallback) when:
//   - body isn't a moon, or has no parent (no vantage planet)
//   - the parent chain doesn't terminate at a star (no light source)
//   - the parent IS the root star (a "moon" orbiting a star directly is the
//     deferred planet-phase case — vantage == light source, degenerate)
//   - any orbital propagation in the chain is invalid (missing mass / a,
//     broken parent ref) so computeRootRelativePosition returns null
const computeMoonPhaseGeometric = (moonBody, absDay, bodiesById) => {
  if (!moonBody || moonBody.kind !== "moon") return null;
  if (!moonBody.parentBodyId || !bodiesById) return null;
  const parent = bodiesById[moonBody.parentBodyId];
  if (!parent) return null;
  // Walk to the root (chain terminus). Bail on cycles / broken refs.
  let root = parent;
  let safety = 0;
  while (root && root.parentBodyId) {
    root = bodiesById[root.parentBodyId];
    if (++safety > 100) return null;
  }
  if (!root || root.kind !== "star") return null;
  // Parent must not itself be the root star (planet-phase case → defer).
  if (parent.id === root.id) return null;
  const planetPos = computeRootRelativePosition(parent, absDay, bodiesById);
  const moonPos = computeRootRelativePosition(moonBody, absDay, bodiesById);
  if (!planetPos || !moonPos) return null;
  const planetToStar = { x: -planetPos.x, y: -planetPos.y, z: -planetPos.z };
  const planetToMoon = { x: moonPos.x - planetPos.x, y: moonPos.y - planetPos.y, z: moonPos.z - planetPos.z };
  const elongation = angleBetweenVectors(planetToStar, planetToMoon); // 0..180
  return fractionToPhaseIndex(elongation / 360);
};

// ─── Alignment finders (r010) ────────────────────────────────────────────────
//
// Phase alignment finder. Returns events where all selected bodies'
// mean anomalies fall within `toleranceDegrees` of each other simultaneously.
// "Phase alignment = all moons at same fractional cycle position" per the
// scoping doc.
//
// Math: each body's mean anomaly at time t is M(t) = (M_0 + 360°×t/T) mod
// 360°. The "spread" of a set of bodies at time t is the smallest arc on
// the circle that contains all their mean anomalies — equivalent to
// (360° - largest_gap_between_sorted_anomalies). Spread ≤ tolerance →
// phase event.
//
// Algorithm: sample t at adaptive step (shortest_period / 100, floor 0.1
// days). Track when spread crosses below tolerance, record the local
// minimum within that window, emit on exit. Avoids emitting one event per
// sample inside a tolerance-grazing pass.
//
// Bodies must share a common parent (sibling alignment) but this isn't
// enforced — caller is responsible for kind-aware filtering per CM.9.
// parentMass is the parent body's mass in M⊕; needed to derive orbital
// periods.
const findPhaseAlignments = ({
  bodies,
  parentMass,
  dateRangeStart,
  dateRangeEnd,
  toleranceDegrees,
  resultLimit = 500,
}) => {
  if (!Array.isArray(bodies) || bodies.length < 2) return [];
  if (!Number.isFinite(parentMass) || parentMass <= 0) return [];
  if (!Number.isFinite(dateRangeStart) || !Number.isFinite(dateRangeEnd)) return [];
  if (dateRangeEnd < dateRangeStart) return [];
  const tol = Number.isFinite(toleranceDegrees) ? toleranceDegrees : 18;
  if (tol <= 0 || tol >= 360) return [];

  // Pre-compute periods. Bail if any body lacks valid orbital data —
  // can't align bodies we can't propagate.
  const periods = bodies.map(b =>
    computeOrbitalPeriodDays(b?.orbitalElements?.semiMajorAxis, parentMass)
  );
  if (periods.some(p => !Number.isFinite(p) || p <= 0)) return [];

  // Mean anomaly at epoch for each body (degrees). Defaults to 0 when not
  // set — common for migrated v1.4 bodies that had no orbital elements.
  const M0s = bodies.map(b =>
    Number.isFinite(b?.orbitalElements?.meanAnomalyAtEpoch)
      ? b.orbitalElements.meanAnomalyAtEpoch
      : 0
  );

  // Mean anomaly at time t (days from epoch). Returns degrees in [0, 360).
  const meanAnomaly = (bodyIdx, t) => {
    const T = periods[bodyIdx];
    let M = (M0s[bodyIdx] + 360 * t / T) % 360;
    if (M < 0) M += 360;
    return M;
  };

  // Spread = smallest arc containing all anomalies = 360 - largest_gap.
  // Sort the angles, walk consecutive pairs, find the largest gap. The
  // gap wraps around (last → first + 360).
  const computeSpread = (t) => {
    const angles = bodies.map((_, i) => meanAnomaly(i, t)).sort((a, b) => a - b);
    let maxGap = 0;
    for (let i = 0; i < angles.length; i++) {
      const next = i === angles.length - 1 ? angles[0] + 360 : angles[i + 1];
      const gap = next - angles[i];
      if (gap > maxGap) maxGap = gap;
    }
    return 360 - maxGap;
  };

  // Sample step: shortest period / 100, floored at 0.1 days. For Moon-like
  // periods (27 d) this gives ~0.27 day samples; a 100-year window =
  // ~135k samples. Phase math is cheap (O(N log N) per sample for the
  // sort) so this stays well under interactive-pause thresholds.
  const shortestPeriod = Math.min(...periods);
  const stepDays = Math.max(0.1, shortestPeriod / 100);

  const events = [];
  let inEvent = false;
  let eventMin = { t: 0, spread: Infinity };

  for (let t = dateRangeStart; t <= dateRangeEnd; t += stepDays) {
    const spread = computeSpread(t);
    if (spread <= tol) {
      if (!inEvent || spread < eventMin.spread) {
        eventMin = { t, spread };
      }
      inEvent = true;
    } else if (inEvent) {
      events.push({
        absoluteDay: Math.round(eventMin.t),
        spreadDegrees: eventMin.spread,
        bodyIds: bodies.map(b => b.id),
      });
      if (events.length >= resultLimit) break;
      inEvent = false;
      eventMin = { t: 0, spread: Infinity };
    }
  }
  if (inEvent && events.length < resultLimit) {
    events.push({
      absoluteDay: Math.round(eventMin.t),
      spreadDegrees: eventMin.spread,
      bodyIds: bodies.map(b => b.id),
    });
  }
  return events;
};

// Conjunction alignment finder. Returns events where the maximum pairwise
// angular separation between all selected bodies' root-relative position
// vectors falls within `toleranceDegrees`. "Conjunction = same sky angle
// from root ancestor" per the scoping doc.
//
// Bodies must share a root ancestor (CM.9 eligibility rule); caller is
// responsible for that filter. Math handles multi-level chains via
// computeRootRelativePosition so non-sibling pairs (e.g. Earth's Moon +
// Mars from Sol's view) work correctly.
//
// Algorithm: same sample-then-peak-detect pattern as findPhaseAlignments.
// At each sample t, compute each body's root-relative position, take max
// over all pairs of angle-between-vectors. Spread crosses below tolerance
// → record local minimum, emit on exit.
//
// Sample step: shortest_period/100, matching phase finder (Item 3 Sub-D
// Option 1). Position computation is heavier than phase (Kepler solve +
// rotation per body per sample) but worldbuilder scales keep this well
// within interactive budget.
const findConjunctionAlignments = ({
  bodies,
  bodiesById,
  dateRangeStart,
  dateRangeEnd,
  toleranceDegrees,
  resultLimit = 500,
}) => {
  if (!Array.isArray(bodies) || bodies.length < 2) return [];
  if (!bodiesById || typeof bodiesById !== "object") return [];
  if (!Number.isFinite(dateRangeStart) || !Number.isFinite(dateRangeEnd)) return [];
  if (dateRangeEnd < dateRangeStart) return [];
  const tol = Number.isFinite(toleranceDegrees) ? toleranceDegrees : 1;
  if (tol <= 0 || tol >= 360) return [];

  // Pre-compute orbital periods for sample-step sizing. For each body,
  // walk up to find its immediate parent's mass — periods govern how fast
  // a body's position changes, which sets the sample resolution.
  const periods = bodies.map(b => {
    const parent = bodiesById[b?.parentBodyId];
    return computeOrbitalPeriodDays(b?.orbitalElements?.semiMajorAxis, parent?.physicalParams?.mass);
  });
  if (periods.some(p => !Number.isFinite(p) || p <= 0)) return [];
  const stepDays = Math.max(0.1, Math.min(...periods) / 100);

  // Max pairwise separation at time t. Returns Infinity if any body's
  // root-relative position can't be computed (broken chain, missing data).
  const computeMaxSeparation = (t) => {
    const positions = bodies.map(b => computeRootRelativePosition(b, t, bodiesById));
    if (positions.some(p => !p)) return Infinity;
    let maxSep = 0;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const sep = angleBetweenVectors(positions[i], positions[j]);
        if (sep > maxSep) maxSep = sep;
      }
    }
    return maxSep;
  };

  const events = [];
  let inEvent = false;
  let eventMin = { t: 0, sep: Infinity };
  for (let t = dateRangeStart; t <= dateRangeEnd; t += stepDays) {
    const sep = computeMaxSeparation(t);
    if (sep <= tol) {
      if (!inEvent || sep < eventMin.sep) {
        eventMin = { t, sep };
      }
      inEvent = true;
    } else if (inEvent) {
      events.push({
        absoluteDay: Math.round(eventMin.t),
        separationDegrees: eventMin.sep,
        bodyIds: bodies.map(b => b.id),
      });
      if (events.length >= resultLimit) break;
      inEvent = false;
      eventMin = { t: 0, sep: Infinity };
    }
  }
  if (inEvent && events.length < resultLimit) {
    events.push({
      absoluteDay: Math.round(eventMin.t),
      separationDegrees: eventMin.sep,
      bodyIds: bodies.map(b => b.id),
    });
  }
  return events;
};

// Eclipse alignment finder (r013). Returns events where the eclipsing
// body passes between an observer and the eclipsed body, with eclipse
// magnitude ≥ `minMagnitude`. Standard astronomical magnitude:
//   magnitude = (R_eclipsing + R_eclipsed − separation) / (2 · R_eclipsed)
// where R values are angular radii from observer, separation is angular
// distance between bodies as seen from observer. Magnitude ≥ 1 = total
// eclipse (eclipsing disk fully covers eclipsed); 0.5 = half-coverage;
// 0 = edges just touching; <0 = no overlap (not recorded as event).
//
// Role conventions (r013 positional, refines later):
//   bodies[0] = eclipsing body  (e.g., a moon)
//   bodies[1] = eclipsed body   (e.g., a star)
// Observer = eclipsing body's parent (no observer = no eclipse).
//
// Preconditions:
//   - bodies array has exactly 2 entries (caller enforces via CM.9
//     eligibility cap, which blocks 3rd pick under eclipse).
//   - both bodies have valid orbital elements and physical radius.
//   - eclipsing body has a parent (the observer point).
//   - both bodies share a root ancestor (eligible-set rule).
// Returns [] for any missing precondition.
//
// Algorithm: sample at step = eclipsing_period/100 (Item 3 Sub-D Option 1
// from r011). At each sample compute root-relative positions of observer,
// eclipsing, eclipsed bodies; derive observer→body vectors; check that
// eclipsing is closer than eclipsed (otherwise no eclipse geometry);
// compute magnitude. Track local MAXIMUM magnitude through each
// tolerance-exceeding window (phase/conjunction tracked minimum spread;
// eclipse peaks at maximum coverage).

const R_EARTH_IN_AU = 6371 / 149597870.7; // Earth radii to AU conversion

const findEclipseAlignments = ({
  bodies,
  bodiesById,
  dateRangeStart,
  dateRangeEnd,
  minMagnitude,
  resultLimit = 500,
}) => {
  if (!Array.isArray(bodies) || bodies.length !== 2) return [];
  if (!bodiesById || typeof bodiesById !== "object") return [];
  if (!Number.isFinite(dateRangeStart) || !Number.isFinite(dateRangeEnd)) return [];
  if (dateRangeEnd < dateRangeStart) return [];
  const tol = Number.isFinite(minMagnitude) ? minMagnitude : 0.5;
  if (tol <= 0) return [];

  const [eclipsing, eclipsed] = bodies;
  if (!eclipsing || !eclipsed) return [];
  if (!eclipsing.parentBodyId) return []; // observer = eclipsing's parent

  const observer = bodiesById[eclipsing.parentBodyId];
  if (!observer) return [];

  const r_ecl_earth = eclipsing?.physicalParams?.radius;
  const r_eclipsed_earth = eclipsed?.physicalParams?.radius;
  if (!Number.isFinite(r_ecl_earth) || r_ecl_earth <= 0) return [];
  if (!Number.isFinite(r_eclipsed_earth) || r_eclipsed_earth <= 0) return [];
  const r_ecl_au = r_ecl_earth * R_EARTH_IN_AU;
  const r_eclipsed_au = r_eclipsed_earth * R_EARTH_IN_AU;

  // Sample step. Phase/conjunction use period/100 because their tolerance
  // (degrees of angular spread or separation) is wider than the per-sample
  // angular motion. Eclipse tolerance is in fractions of the eclipsed
  // body's angular SIZE — much narrower scale. Step needs to be fine
  // enough to catch the narrow magnitude-above-threshold window.
  //
  // Heuristic: eclipse duration ~ 2 × (eclipsed_angular_radius) /
  // (eclipsing_angular_speed). Step = duration / 5 ensures ~5 samples
  // through the peak. Fall back to period/1000 if geometry inputs are
  // missing (e.g., observer with no semi-major axis — root observer).
  const T_ecl = computeOrbitalPeriodDays(
    eclipsing?.orbitalElements?.semiMajorAxis,
    observer?.physicalParams?.mass
  );
  if (!Number.isFinite(T_ecl) || T_ecl <= 0) return [];
  const observerSemiMajor = observer?.orbitalElements?.semiMajorAxis || 1.0;
  const approxAng_ed_deg = Math.atan2(r_eclipsed_au, observerSemiMajor) * RAD_TO_DEG;
  const eclipsingSpeedDegPerDay = 360 / T_ecl;
  const stepDays = Math.max(0.001,
    Math.min(T_ecl / 100, (approxAng_ed_deg / eclipsingSpeedDegPerDay) / 5)
  );

  // Per-sample magnitude. Returns -Infinity if geometry doesn't admit
  // an eclipse (positions can't be computed, or eclipsing is behind
  // eclipsed from observer's view).
  const computeMagnitudeAt = (t) => {
    const obsPos = computeRootRelativePosition(observer, t, bodiesById);
    const eclPos = computeRootRelativePosition(eclipsing, t, bodiesById);
    const edPos = computeRootRelativePosition(eclipsed, t, bodiesById);
    if (!obsPos || !eclPos || !edPos) return -Infinity;
    const v_ecl = { x: eclPos.x - obsPos.x, y: eclPos.y - obsPos.y, z: eclPos.z - obsPos.z };
    const v_ed = { x: edPos.x - obsPos.x, y: edPos.y - obsPos.y, z: edPos.z - obsPos.z };
    const d_ecl = Math.sqrt(v_ecl.x * v_ecl.x + v_ecl.y * v_ecl.y + v_ecl.z * v_ecl.z);
    const d_ed = Math.sqrt(v_ed.x * v_ed.x + v_ed.y * v_ed.y + v_ed.z * v_ed.z);
    if (d_ecl === 0 || d_ed === 0) return -Infinity;
    // Eclipsing must be closer to observer than eclipsed (in front of it).
    // If behind, no eclipse — could be occultation in reverse but that's
    // a different phenomenon.
    if (d_ecl >= d_ed) return -Infinity;
    // Angular separation between bodies as seen from observer.
    const sep = angleBetweenVectors(v_ecl, v_ed);
    // Apparent angular radii (small-angle: atan(r/d), in degrees).
    const ang_ecl = Math.atan2(r_ecl_au, d_ecl) * RAD_TO_DEG;
    const ang_ed = Math.atan2(r_eclipsed_au, d_ed) * RAD_TO_DEG;
    // Standard eclipse magnitude formula.
    return (ang_ecl + ang_ed - sep) / (2 * ang_ed);
  };

  const events = [];
  let inEvent = false;
  let eventMax = { t: 0, magnitude: -Infinity };
  for (let t = dateRangeStart; t <= dateRangeEnd; t += stepDays) {
    const mag = computeMagnitudeAt(t);
    if (mag >= tol) {
      if (!inEvent || mag > eventMax.magnitude) {
        eventMax = { t, magnitude: mag };
      }
      inEvent = true;
    } else if (inEvent) {
      events.push({
        absoluteDay: Math.round(eventMax.t),
        magnitude: eventMax.magnitude,
        bodyIds: [eclipsing.id, eclipsed.id],
      });
      if (events.length >= resultLimit) break;
      inEvent = false;
      eventMax = { t: 0, magnitude: -Infinity };
    }
  }
  if (inEvent && events.length < resultLimit) {
    events.push({
      absoluteDay: Math.round(eventMax.t),
      magnitude: eventMax.magnitude,
      bodyIds: [eclipsing.id, eclipsed.id],
    });
  }
  return events;
};

// Nodal alignment finder (r014). Returns events where multiple bodies are
// simultaneously near their orbital nodes (where each body's orbital
// plane crosses its parent's reference plane). Argument of latitude
// u = ω + ν is 0° at ascending node, 180° at descending. Distance from
// nearest node = min(u mod 180°, 180° - (u mod 180°)). The criterion is:
// max-over-bodies of node-distance ≤ toleranceDegrees (every body must
// be near A node, ascending or descending — mixed allowed).
//
// Preconditions (caller enforces via CM.9 eligibility):
//   - 2+ bodies, all sharing the same parentBodyId (nodes defined in
//     parent's reference frame; cross-parent nodal alignment isn't
//     physically meaningful)
//   - all bodies have inclination > 0 (zero-inclination orbits are
//     trivially "always at a node")
//
// Sample step: geometry-aware. Argument of latitude changes at
// 360°/T per body. Node-crossing window of `tol` degrees spans
// 2·tol/(360/T) = tol·T/180 days. Use ~5 samples through the window:
// step = tol·T/(5·180), capped above by T/100 (the phase/conjunction
// baseline) so it doesn't go too coarse when tolerance is wide.
const findNodalAlignments = ({
  bodies,
  bodiesById,
  dateRangeStart,
  dateRangeEnd,
  toleranceDegrees,
  resultLimit = 500,
}) => {
  if (!Array.isArray(bodies) || bodies.length < 2) return [];
  if (!bodiesById || typeof bodiesById !== "object") return [];
  if (!Number.isFinite(dateRangeStart) || !Number.isFinite(dateRangeEnd)) return [];
  if (dateRangeEnd < dateRangeStart) return [];
  const tol = Number.isFinite(toleranceDegrees) ? toleranceDegrees : 1;
  if (tol <= 0 || tol >= 90) return [];

  // Pre-compute per-body orbital params. Bail on any invalid input.
  const periods = [];
  const M0s = [];
  const es = [];
  const omegas = [];
  for (const b of bodies) {
    const oe = b?.orbitalElements;
    if (!oe) return [];
    if (!Number.isFinite(oe.inclination) || oe.inclination <= 0) return [];
    const parent = bodiesById[b.parentBodyId];
    const parentMass = parent?.physicalParams?.mass;
    const T = computeOrbitalPeriodDays(oe.semiMajorAxis, parentMass);
    if (!Number.isFinite(T) || T <= 0) return [];
    periods.push(T);
    M0s.push(Number.isFinite(oe.meanAnomalyAtEpoch) ? oe.meanAnomalyAtEpoch : 0);
    es.push(Number.isFinite(oe.eccentricity) ? oe.eccentricity : 0);
    omegas.push(Number.isFinite(oe.argumentOfPeriapsis) ? oe.argumentOfPeriapsis : 0);
  }

  const minPeriod = Math.min(...periods);
  const geometryStep = (tol * minPeriod) / (5 * 180);
  const stepDays = Math.max(0.001, Math.min(minPeriod / 100, geometryStep));

  // Distance from nearest node for body i at time t (degrees, 0 at node,
  // 90 at quadrature). Uses true anomaly so eccentricity is handled
  // correctly (with e=0, this reduces to mean anomaly).
  const distanceToNode = (i, t) => {
    const M = ((M0s[i] + 360 * t / periods[i]) % 360 + 360) % 360;
    const nu = meanToTrueAnomaly(M, es[i]);
    const u = ((omegas[i] + nu) % 360 + 360) % 360;
    const uMod180 = u % 180;
    return Math.min(uMod180, 180 - uMod180);
  };

  const computeMaxDistance = (t) => {
    let maxD = 0;
    for (let i = 0; i < bodies.length; i++) {
      const d = distanceToNode(i, t);
      if (d > maxD) maxD = d;
    }
    return maxD;
  };

  const events = [];
  let inEvent = false;
  let eventMin = { t: 0, dist: Infinity };
  for (let t = dateRangeStart; t <= dateRangeEnd; t += stepDays) {
    const dist = computeMaxDistance(t);
    if (dist <= tol) {
      if (!inEvent || dist < eventMin.dist) {
        eventMin = { t, dist };
      }
      inEvent = true;
    } else if (inEvent) {
      events.push({
        absoluteDay: Math.round(eventMin.t),
        maxNodeDistanceDegrees: eventMin.dist,
        bodyIds: bodies.map(b => b.id),
      });
      if (events.length >= resultLimit) break;
      inEvent = false;
      eventMin = { t: 0, dist: Infinity };
    }
  }
  if (inEvent && events.length < resultLimit) {
    events.push({
      absoluteDay: Math.round(eventMin.t),
      maxNodeDistanceDegrees: eventMin.dist,
      bodyIds: bodies.map(b => b.id),
    });
  }
  return events;
};

// ─── CM.9 eligibility helpers (r012) ─────────────────────────────────────────
//
// Per-body eligibility for the currently-active alignment query. Used by
// the Compute-mode tree picker to dim ineligible bodies, block their
// clicks, and sort eligible bodies to the top of each tree level. Also
// used to auto-deselect bodies that become invalid when the user changes
// alignment type mid-setup.
//
// Eligibility rules per alignment type (locked from scoping):
//   - phase: bodies sharing immediate parentBodyId
//   - conjunction: bodies sharing root ancestor (top of parent chain)
//   - eclipse: TBD (r013 — returns false until implemented)
//   - nodal: TBD (r014 — returns false until implemented)
//
// Cascading anchor (CM.9 Sub-B): empty selection → all computable bodies
// eligible (no anchor); non-empty selection → anchor defined by the
// picked-set; new bodies must share the relevant ancestor; already-
// picked bodies always re-clickable (to deselect).

// Walk up parent chain, return root ancestor's id. Returns body's own
// id if it has no parent. Returns null on cycles (safety cap at 100).
// Broken chains (missing parent ref) treat the last-seen body as the
// effective root.
const getRootAncestorId = (bodyId, bodiesById) => {
  let cur = bodiesById?.[bodyId];
  if (!cur) return null;
  let safety = 0;
  while (cur && cur.parentBodyId) {
    const next = bodiesById[cur.parentBodyId];
    if (!next) return cur.id;
    cur = next;
    if (++safety > 100) return null;
  }
  return cur?.id || null;
};

// Per-body eligibility. Returns boolean.
// ─── Forced Alignment math (v1.5 r045) ───────────────────────────────────
//
// Inverse of the Compute math: given a target alignment at a given day,
// compute what edits to mean-anomaly-at-epoch (and optionally semi-major
// axis, for recurring intervals) would force each picked body into the
// alignment.
//
// Eligibility: a body can be force-aligned iff (a) it has a parent, (b) the
// parent's mass is set, and (c) the body's own semi-major axis is set. Those
// three give us a valid current orbital period to work from. Inclination,
// eccentricity, ω, Ω may all be at their defaults — that's fine; the math
// works to first order and the user can always rerun a Compute query to
// verify the resulting alignment lands within their tolerance.

const isBodyEligibleForForceAlign = (body, bodiesById) => {
  if (!body) return false;
  if (!isComputableKind(body.kind)) return false;
  if (!body.parentBodyId) return false;
  const parent = bodiesById?.[body.parentBodyId];
  if (!parent) return false;
  const pm = parent?.physicalParams?.mass;
  if (!Number.isFinite(pm) || pm <= 0) return false;
  const a = body?.orbitalElements?.semiMajorAxis;
  if (!Number.isFinite(a) || a <= 0) return false;
  return true;
};

// Inverse of computeOrbitalPeriodDays. Given a desired period in days and
// the parent's mass in Earth masses, returns the semi-major axis in AU that
// produces that period under Kepler's third law. Returns null on bad input.
const computeSmaFromPeriod = (periodDays, parentMassEarths) => {
  if (!Number.isFinite(periodDays) || periodDays <= 0) return null;
  if (!Number.isFinite(parentMassEarths) || parentMassEarths <= 0) return null;
  const tYears = periodDays / DAYS_PER_YEAR;
  const massSolar = parentMassEarths / M_SUN_IN_EARTHS;
  // a³ = T² · M_solar → a = ∛(T² · M_solar)
  return Math.cbrt(tYears * tYears * massSolar);
};

// Per-alignment-type target mean anomaly at the target day. Phase aligns
// every body to the SAME fractional position in its cycle — `phaseFraction`
// picks which (0 = periapsis, 0.5 = apoapsis, 0.25 = first quarter, etc.).
// Conjunction aligns bodies to share the same root-relative direction; for
// circular coplanar orbits the in-plane angle is approximately M + ω + Ω,
// so we set M(D) = -ω - Ω to hit the reference direction (zero longitude).
// Nodal puts each body at its ascending node (argument of latitude 0), which
// for low-e orbits is M ≈ -ω. Eclipse is handled separately in
// computeForceAlignPreview because it rewrites ascending node too.
const targetMeanAnomalyForBody = (body, alignmentType, phaseFraction) => {
  const oe = body?.orbitalElements || {};
  const norm = (a) => ((a % 360) + 360) % 360;
  if (alignmentType === "phase") {
    const f = Number.isFinite(phaseFraction) ? phaseFraction : 0;
    return norm(f * 360);
  }
  if (alignmentType === "nodal") {
    const w = Number.isFinite(oe.argumentOfPeriapsis) ? oe.argumentOfPeriapsis : 0;
    return norm(-w);
  }
  // conjunction.
  const w = Number.isFinite(oe.argumentOfPeriapsis) ? oe.argumentOfPeriapsis : 0;
  const O = Number.isFinite(oe.ascendingNode) ? oe.ascendingNode : 0;
  return norm(-w - O);
};

// Inverse Kepler: given a target TRUE anomaly ν (degrees) and eccentricity,
// returns the MEAN anomaly M (degrees) that produces ν under forward
// propagation. For circular orbits M = ν exactly; for eccentric ones we
// solve E from ν via the half-angle formula, then M = E - e sin E. atan2
// handles the full 0–360 range without quadrant ambiguity. e clamped to
// [0, 0.99) to stay within Cartulary's bound-elliptical scope.
const meanAnomalyFromTrueAnomaly = (trueAnomalyDeg, e) => {
  let ee = Number.isFinite(e) ? Math.max(0, Math.min(0.99, e)) : 0;
  const norm = (a) => ((a % 360) + 360) % 360;
  if (ee === 0) return norm(trueAnomalyDeg);
  const trueRad = trueAnomalyDeg * DEG_TO_RAD;
  const eccRad = 2 * Math.atan2(
    Math.sqrt(1 - ee) * Math.sin(trueRad / 2),
    Math.sqrt(1 + ee) * Math.cos(trueRad / 2)
  );
  const meanRad = eccRad - ee * Math.sin(eccRad);
  return norm(meanRad * RAD_TO_DEG);
};

// Core preview helper. For each picked body, computes the new orbital
// element values needed to force the alignment at the target day under
// the chosen recurrence. recurInterval=null → one-shot; positive → each
// body's period gets rewritten to N/k for the integer k that minimizes
// sma disruption (k_i = max(1, round(N / current_T_i))).
//
// Eclipse type triggers full-3D forcing: ascending node Ω is rewritten to
// 0 per body so every picked body's orbital plane contains the global +x
// axis (the shared eclipse direction), and target true anomaly ν = -ω is
// solved back to mean anomaly via inverse Kepler so eccentric orbits land
// correctly. Other types leave Ω alone and use the simpler in-plane M
// targets from targetMeanAnomalyForBody.
//
// Returns { eligible: [...rows], ineligible: [...rows] } where each eligible
// row carries: { id, name, currentSma, newSma, deltaSmaPct, currentM0,
// newM0, currentOmega, newOmega, omegaRewritten, kValue, currentT, newT,
// warnLargeSma }. Ineligible rows carry { id, name, reason }.
const computeForceAlignPreview = (bodyIds, bodies, bodiesById, alignmentType, targetDayAbs, recurInterval, phaseFraction) => {
  const eligible = [];
  const ineligible = [];
  const warnings = [];
  const norm = (a) => ((a % 360) + 360) % 360;
  const isEclipse = alignmentType === "eclipse";
  const isNodal   = alignmentType === "nodal";
  const pickedSet = new Set(bodyIds);

  for (const id of bodyIds) {
    const b = bodiesById?.[id];
    if (!b) { ineligible.push({ id, name: "(missing)", reason: "Body no longer exists." }); continue; }
    if (!isBodyEligibleForForceAlign(b, bodiesById)) {
      const why = !b.parentBodyId ? "No parent body — nothing to orbit."
                : !bodiesById?.[b.parentBodyId] ? "Parent body missing."
                : !Number.isFinite(bodiesById[b.parentBodyId]?.physicalParams?.mass) || bodiesById[b.parentBodyId].physicalParams.mass <= 0
                  ? "Parent body has no mass set — can't compute period."
                : !Number.isFinite(b.orbitalElements?.semiMajorAxis) || b.orbitalElements.semiMajorAxis <= 0
                  ? "No semi-major axis set — nothing to start from."
                : "Not eligible for forced alignment.";
      ineligible.push({ id, name: b.name || "(unnamed)", reason: why });
      continue;
    }
    // r048 G1: nodal needs non-zero inclination to have real nodes — a
    // coplanar body has no node to align to (every point on its orbit is
    // "at" the reference plane). Mirrors Compute's existing nodal filter.
    if (isNodal) {
      const inc = b?.orbitalElements?.inclination;
      if (!Number.isFinite(inc) || inc <= 0) {
        ineligible.push({ id, name: b.name || "(unnamed)", reason: "Nodal alignment needs inclination > 0 — coplanar orbits have no nodes." });
        continue;
      }
    }
    const parent = bodiesById[b.parentBodyId];
    const parentMass = parent.physicalParams.mass;
    const oe = b.orbitalElements || {};
    const currentSma = oe.semiMajorAxis;
    const currentM0  = Number.isFinite(oe.meanAnomalyAtEpoch) ? oe.meanAnomalyAtEpoch : 0;
    const currentOmega = Number.isFinite(oe.ascendingNode) ? oe.ascendingNode : 0;
    const currentT = computeOrbitalPeriodDays(currentSma, parentMass);

    let newSma = currentSma;
    let newT   = currentT;
    let kValue = null;
    if (Number.isFinite(recurInterval) && recurInterval > 0 && Number.isFinite(currentT) && currentT > 0) {
      kValue = Math.max(1, Math.round(recurInterval / currentT));
      newT   = recurInterval / kValue;
      newSma = computeSmaFromPeriod(newT, parentMass);
      if (!Number.isFinite(newSma) || newSma <= 0) {
        ineligible.push({ id, name: b.name || "(unnamed)", reason: "Couldn't solve sma for the chosen recurrence." });
        continue;
      }
    }

    let newOmega = currentOmega;
    let targetM;
    if (isEclipse) {
      newOmega = 0;
      const w = Number.isFinite(oe.argumentOfPeriapsis) ? oe.argumentOfPeriapsis : 0;
      const ecc = Number.isFinite(oe.eccentricity) ? oe.eccentricity : 0;
      targetM = meanAnomalyFromTrueAnomaly(-w, ecc);
    } else {
      targetM = targetMeanAnomalyForBody(b, alignmentType, phaseFraction);
    }
    const newM0 = newT > 0 ? norm(targetM - 360 * targetDayAbs / newT) : norm(targetM);

    const deltaSmaPct = currentSma > 0 ? ((newSma - currentSma) / currentSma) * 100 : 0;
    const warnLargeSma = Math.abs(deltaSmaPct) > 50;

    eligible.push({
      id, name: b.name || "(unnamed)",
      currentSma, newSma, deltaSmaPct,
      currentM0, newM0,
      currentOmega, newOmega,
      omegaRewritten: isEclipse,
      kValue,
      currentT, newT,
      warnLargeSma,
    });
  }

  // r048 G3: eclipse chain-completeness check. For each eligible body in
  // eclipse mode, walk up its parent chain. Any unpicked ancestor that has
  // a parent of its own (i.e., is not the root) breaks the chain — the
  // unpicked body stays where it currently is, so the picked body's
  // position composes incorrectly. Surface as a warning per picked body
  // with missing ancestors.
  if (isEclipse) {
    for (const row of eligible) {
      const missing = [];
      let cur = bodiesById?.[row.id];
      let safety = 0;
      while (cur && cur.parentBodyId && safety++ < 100) {
        const parent = bodiesById[cur.parentBodyId];
        if (!parent) break;
        // If the parent has its OWN parent and isn't picked, it's an
        // intermediate ancestor that needs to also be aligned.
        if (parent.parentBodyId && !pickedSet.has(parent.id)) {
          missing.push(parent.name || "(unnamed)");
        }
        cur = parent;
      }
      if (missing.length > 0) {
        warnings.push({
          id: row.id,
          name: row.name,
          message: `Unpicked ancestor${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. The chain to the root won't line up unless ${missing.length > 1 ? "they're" : "it's"} also picked.`,
        });
      }
    }
  }

  // r048 P2: sort eligible by semi-major axis ascending so inner bodies
  // appear first in the preview. Makes eclipse who-eclipses-whom visually
  // obvious (smaller sma = closer to parent = eclipsing body).
  eligible.sort((a, b) => (a.currentSma || 0) - (b.currentSma || 0));

  return { eligible, ineligible, warnings };
};

const isBodyEligibleForAlignment = (body, alignmentType, pickedSet, bodiesById) => {
  if (!body) return false;
  if (!isComputableKind(body.kind)) return false;
  // r052: any body with a parent needs that parent to have positive mass,
  // else its orbital period can't compute and it would silently produce no
  // alignment events. Mirrors the chain-completeness requirement Observe
  // surfaces visually. Root bodies (no parentBodyId) skip this check —
  // they're often the anchor frame, not a moving member of the alignment.
  if (body.parentBodyId) {
    const parent = bodiesById?.[body.parentBodyId];
    if (!parent) return false;
    const pm = parent?.physicalParams?.mass;
    if (!Number.isFinite(pm) || pm <= 0) return false;
  }
  if (pickedSet && pickedSet.has(body.id)) return true;
  // Nodal-specific pre-anchor filter: body must have a parent and non-zero
  // inclination regardless of selection state (these are intrinsic
  // requirements, not anchor-relative).
  if (alignmentType === "nodal") {
    if (!body.parentBodyId) return false;
    const inc = body?.orbitalElements?.inclination;
    if (!Number.isFinite(inc) || inc <= 0) return false;
  }
  if (!pickedSet || pickedSet.size === 0) {
    if (alignmentType === "eclipse") {
      return Number.isFinite(body?.physicalParams?.radius) && body.physicalParams.radius > 0;
    }
    return true;
  }
  const anchorId = pickedSet.values().next().value;
  const anchor = bodiesById?.[anchorId];
  if (!anchor) return true;
  if (alignmentType === "phase") {
    return body.parentBodyId === anchor.parentBodyId;
  }
  if (alignmentType === "conjunction") {
    return getRootAncestorId(body.id, bodiesById)
        === getRootAncestorId(anchor.id, bodiesById);
  }
  if (alignmentType === "eclipse") {
    if (pickedSet.size >= 2) return false;
    if (!Number.isFinite(body?.physicalParams?.radius) || body.physicalParams.radius <= 0) return false;
    return getRootAncestorId(body.id, bodiesById)
        === getRootAncestorId(anchor.id, bodiesById);
  }
  if (alignmentType === "nodal") {
    // Anchor narrows to shared parent (nodes are defined per-parent's
    // reference plane). Intrinsic inclination > 0 check already passed
    // above.
    return body.parentBodyId === anchor.parentBodyId;
  }
  return false;
};

// Bulk computation: given a current pick-set and a NEW alignment type,
// return the subset that's INVALID under the new rules (needs to be
// auto-deselected on type change). Per-type rules:
//   - phase: anchor = first body; everything else must share parentBodyId
//   - conjunction: same as phase but with root ancestor
//   - eclipse: cap at 2; both must have radius; must share root
//   - nodal: all must have inclination > 0 AND share parentBodyId
const findInvalidBodiesForType = (pickedBodyIds, newAlignmentType, bodiesById) => {
  if (!Array.isArray(pickedBodyIds) || pickedBodyIds.length === 0) return [];
  if (newAlignmentType === "eclipse") {
    const invalid = [];
    for (let i = 0; i < pickedBodyIds.length; i++) {
      const b = bodiesById?.[pickedBodyIds[i]];
      if (!b) { invalid.push(pickedBodyIds[i]); continue; }
      if (!Number.isFinite(b?.physicalParams?.radius) || b.physicalParams.radius <= 0) {
        invalid.push(b.id); continue;
      }
      if (i >= 2) { invalid.push(b.id); continue; }
    }
    const survivors = pickedBodyIds.filter(id => !invalid.includes(id)).slice(0, 2);
    if (survivors.length === 2) {
      const root0 = getRootAncestorId(survivors[0], bodiesById);
      const root1 = getRootAncestorId(survivors[1], bodiesById);
      if (root0 !== root1) invalid.push(survivors[1]);
    }
    return invalid;
  }
  if (newAlignmentType === "nodal") {
    // Drop bodies without inclination > 0 or without parent. Then check
    // shared parentBodyId against the first surviving body.
    const invalid = [];
    for (let i = 0; i < pickedBodyIds.length; i++) {
      const b = bodiesById?.[pickedBodyIds[i]];
      if (!b || !b.parentBodyId) { invalid.push(pickedBodyIds[i]); continue; }
      const inc = b?.orbitalElements?.inclination;
      if (!Number.isFinite(inc) || inc <= 0) { invalid.push(b.id); continue; }
    }
    const survivors = pickedBodyIds.filter(id => !invalid.includes(id));
    if (survivors.length >= 2) {
      const anchor = bodiesById?.[survivors[0]];
      if (anchor) {
        for (let i = 1; i < survivors.length; i++) {
          const b = bodiesById[survivors[i]];
          if (b && b.parentBodyId !== anchor.parentBodyId) invalid.push(b.id);
        }
      }
    }
    return invalid;
  }
  if (newAlignmentType !== "phase" && newAlignmentType !== "conjunction") {
    return [...pickedBodyIds];
  }
  if (pickedBodyIds.length < 2) return [];
  const anchor = bodiesById?.[pickedBodyIds[0]];
  if (!anchor) return [];
  const invalid = [];
  for (let i = 1; i < pickedBodyIds.length; i++) {
    const b = bodiesById?.[pickedBodyIds[i]];
    if (!b) continue;
    const ok = newAlignmentType === "phase"
      ? b.parentBodyId === anchor.parentBodyId
      : getRootAncestorId(b.id, bodiesById) === getRootAncestorId(anchor.id, bodiesById);
    if (!ok) invalid.push(b.id);
  }
  return invalid;
};