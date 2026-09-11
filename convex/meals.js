import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) =>
    await ctx.db
      .query("meals")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect(),
});

export const add = mutation({
  args: {
    date: v.string(),
    mealType: v.string(),
    description: v.string(),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    parsedByAI: v.boolean(),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { createdAt, ...fields } = args;
    return await ctx.db.insert("meals", { ...fields, createdAt: createdAt ?? Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("meals") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/** Modifica a posteriori di un pasto (descrizione, tipo, macro/kcal). */
export const update = mutation({
  args: {
    id: v.id("meals"),
    mealType: v.optional(v.string()),
    description: v.optional(v.string()),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    caloriesSource: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});
