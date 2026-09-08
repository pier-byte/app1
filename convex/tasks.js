import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const taskFields = {
  title: v.string(),
  description: v.optional(v.string()),
  category: v.string(),
  categoryColor: v.string(),
  date: v.string(),
  completed: v.boolean(),
  estimatedMinutes: v.optional(v.number()),
  actualMinutes: v.optional(v.number()),
  priority: v.optional(v.number()),
};

// ── Query ──

export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) =>
    await ctx.db
      .query("tasks")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect(),
});

export const listBetween = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) =>
    await ctx.db.query("tasks").withIndex("by_date", (q) => q.gte("date", start).lte("date", end)).collect(),
});

export const listCategories = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("taskCategories").collect(),
});

// ── Mutations ──

export const create = mutation({
  args: { ...taskFields, createdAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { createdAt, ...fields } = args;
    return await ctx.db.insert("tasks", { ...fields, createdAt: createdAt ?? Date.now() });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    categoryColor: v.optional(v.string()),
    date: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    estimatedMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const toggle = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const task = await ctx.db.get(id);
    if (!task) return;
    await ctx.db.patch(id, { completed: !task.completed });
  },
});

/** Sposta il task a domani (data passata dal client per coerenza di timezone). */
export const moveToDate = mutation({
  args: { id: v.id("tasks"), date: v.string() },
  handler: async (ctx, { id, date }) => {
    await ctx.db.patch(id, { date });
  },
});

/** Accumula minuti studiati (dal timer) su un task. */
export const addActualMinutes = mutation({
  args: { id: v.id("tasks"), minutes: v.number() },
  handler: async (ctx, { id, minutes }) => {
    const task = await ctx.db.get(id);
    if (!task) return;
    await ctx.db.patch(id, { actualMinutes: Math.round((task.actualMinutes || 0) + minutes) });
  },
});

// ── Categorie ──

const DEFAULT_CATEGORIES = [
  { name: "Studiare", color: "#30d158", order: 0 },
  { name: "Esercizi", color: "#ffd60a", order: 1 },
  { name: "Verifica/interrogazione", color: "#ff375f", order: 2 },
  { name: "Ripetere", color: "#bf5af2", order: 3 },
  { name: "Leggere", color: "#66d4cf", order: 4 },
  { name: "Ricopiare", color: "#64d2ff", order: 5 },
  { name: "Ricerche/presentazioni", color: "#ac8e68", order: 6 },
];

/** Popola le categorie di default al primo avvio (chiamato dal client se vuote). */
export const ensureDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("taskCategories").collect();
    if (existing.length > 0) return;
    for (const cat of DEFAULT_CATEGORIES) {
      await ctx.db.insert("taskCategories", cat);
    }
  },
});

export const createCategory = mutation({
  args: { name: v.string(), color: v.string(), order: v.number() },
  handler: async (ctx, args) => await ctx.db.insert("taskCategories", args),
});
