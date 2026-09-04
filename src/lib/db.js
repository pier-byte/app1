/**
 * Flag globale: Convex è configurato?
 * È una costante a build-time (import.meta.env), quindi il branching
 * basato su di essa è stabile tra i render.
 */
export const HAS_CONVEX = Boolean(import.meta.env.VITE_CONVEX_URL);
