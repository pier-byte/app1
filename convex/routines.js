import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const stepValidator = v.object({
  name: v.string(),
  targetMinutes: v.number(),
  actualSeconds: v.optional(v.number()),
  completed: v.boolean(),
});

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const rows = await ctx.db
      .query("routines")
      .withIndex("by_date", (q) => q.eq("date", date))
      .take(1);
    return rows[0] ?? null;
  },
});

/** Upsert della routine giornaliera (crea o aggiorna in base alla data). */
export const save = mutation({
  args: {
    date: v.string(),
    routineId: v.optional(v.string()),
    routineName: v.optional(v.string()),
    steps: v.array(stepValidator),
    startedAt: v.optional(v.string()),
    completedAt: v.optional(v.string()),
  },
  handler: async (ctx, { date, routineId, routineName, steps, startedAt, completedAt }) => {
    const rows = await ctx.db
      .query("routines")
      .withIndex("by_date", (q) => q.eq("date", date))
      .take(1);
    const existing = rows[0];
    const patch = { steps, startedAt, completedAt, routineId, routineName };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("routines", { date, ...patch });
  },
});
