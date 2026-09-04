import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Validazione del PIN a 6 cifre.
 * Il PIN non vive mai nel client: viene confrontato con la variabile
 * d'ambiente Convex `APP_PIN` (impostabile con `npx convex env set APP_PIN 123456`).
 * Fallback: se APP_PIN non è impostata sul deployment viene usato "123456".
 */
export const validatePin = mutation({
  args: { pin: v.string() },
  handler: async (_ctx, { pin }) => {
    const expected = process.env.APP_PIN || "123456";
    return { ok: pin === expected };
  },
});
