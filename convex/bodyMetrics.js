import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("bodyMetrics").collect();
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const add = mutation({
  args: {
    date: v.string(),
    weightKg: v.optional(v.number()),
    heightCm: v.optional(v.number()),
  },
  handler: async (ctx, args) => await ctx.db.insert("bodyMetrics", args),
});

export const remove = mutation({
  args: { id: v.id("bodyMetrics") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/** Corregge una registrazione esistente (peso/altezza/data). */
export const update = mutation({
  args: {
    id: v.id("bodyMetrics"),
    date: v.optional(v.string()),
    weightKg: v.optional(v.number()),
    heightCm: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});
