import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Spese ──

export const listExpensesBetween = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) =>
    await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) => q.gte("date", start).lte("date", end))
      .collect(),
});

export const addExpense = mutation({
  args: {
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { createdAt, ...fields } = args;
    return await ctx.db.insert("expenses", { ...fields, createdAt: createdAt ?? Date.now() });
  },
});

export const removeExpense = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/** Modifica a posteriori di una spesa (descrizione, importo, categoria, data). */
export const updateExpense = mutation({
  args: {
    id: v.id("expenses"),
    date: v.optional(v.string()),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

// ── Budget ──

export const getBudget = query({
  args: { weekStart: v.string() },
  handler: async (ctx, { weekStart }) => {
    const rows = await ctx.db
      .query("weeklyBudget")
      .withIndex("by_week", (q) => q.eq("weekStart", weekStart))
      .take(1);
    return rows[0] ?? null;
  },
});

export const setBudget = mutation({
  args: { weekStart: v.string(), budgetAmount: v.number() },
  handler: async (ctx, { weekStart, budgetAmount }) => {
    const rows = await ctx.db
      .query("weeklyBudget")
      .withIndex("by_week", (q) => q.eq("weekStart", weekStart))
      .take(1);
    const existing = rows[0];
    if (existing) {
      await ctx.db.patch(existing._id, { budgetAmount });
      return existing._id;
    }
    return await ctx.db.insert("weeklyBudget", { weekStart, budgetAmount });
  },
});
