/**
 * Value noise — the reason the hills have bumps instead of being one clean
 * bezier wave.
 *
 * A single sine or a hand-authored bezier gives you a *shape*; terrain needs a
 * shape that keeps having smaller shapes on it all the way down, which is what
 * fractal Brownian motion (`fbm1D`) is: the same noise summed at doubling
 * frequencies and halving amplitudes. One octave is a rolling swell, four
 * octaves is a hillside with knolls and dips on it.
 *
 * 1D only, on purpose. Everything in this backdrop that needs noise needs it
 * along a horizontal — ridgelines, the wobble of a blob's outline traversed by
 * angle, the width of a footpath down its length. 2D noise would be dead code.
 */
import { mulberry32 } from "./rng";

/**
 * A smooth, seamlessly repeating noise function over a 256-unit period.
 * Interpolation is smoothstep, so the result has no visible kinks at the
 * lattice points — important, because a kink in a ridgeline reads as a
 * polygon, and polygons are what we're trying to get away from.
 */
export function makeNoise1D(seed: number): (x: number) => number {
  const size = 256;
  const next = mulberry32(seed);
  const table = new Float64Array(size);
  for (let i = 0; i < size; i += 1) table[i] = next() * 2 - 1;

  return function noise(x: number) {
    const i = Math.floor(x);
    const f = x - i;
    const s = f * f * (3 - 2 * f); // smoothstep
    const a = table[((i % size) + size) % size];
    const b = table[(((i + 1) % size) + size) % size];
    return a + (b - a) * s;
  };
}

/**
 * Sum `octaves` of `noise` at increasing frequency and decreasing amplitude,
 * normalised back to roughly [-1, 1].
 *
 * `lacunarity` is deliberately 2.07 rather than 2: at exactly 2 the octaves
 * share lattice points and the sum develops a faint regular rhythm, which is
 * exactly the "procedurally generated" tell we're avoiding.
 */
export function fbm1D(
  noise: (x: number) => number,
  x: number,
  octaves = 4,
  lacunarity = 2.07,
  gain = 0.5,
): number {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += noise(x * frequency) * amplitude;
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / norm;
}
