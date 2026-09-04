import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const dayPlanValidator = v.object({
  day: v.string(),
  colazione: v.string(),
  pranzo: v.string(),
  cena: v.string(),
  spuntino: v.optional(v.string()),
});

export const getByWeek = query({
  args: { weekStart: v.string() },
  handler: async (ctx, { weekStart }) => {
    const rows = await ctx.db
      .query("weeklyMealPlan")
      .withIndex("by_week", (q) => q.eq("weekStart", weekStart))
      .take(1);
    return rows[0] ?? null;
  },
});

/** Upsert del piano settimanale (usato anche per lo swap rapido dei giorni). */
export const save = mutation({
  args: { weekStart: v.string(), plan: v.array(dayPlanValidator) },
  handler: async (ctx, { weekStart, plan }) => {
    const rows = await ctx.db
      .query("weeklyMealPlan")
      .withIndex("by_week", (q) => q.eq("weekStart", weekStart))
      .take(1);
    const existing = rows[0];
    if (existing) {
      await ctx.db.patch(existing._id, { plan });
      return existing._id;
    }
    return await ctx.db.insert("weeklyMealPlan", { weekStart, plan });
  },
});
