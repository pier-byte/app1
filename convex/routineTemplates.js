import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const stepValidator = v.object({
  name: v.string(),
  targetMinutes: v.number(),
});

export const listAll = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("routineTemplates").collect(),
});

export const create = mutation({
  args: { name: v.string(), emoji: v.string(), color: v.string(), steps: v.array(stepValidator) },
  handler: async (ctx, args) => await ctx.db.insert("routineTemplates", args),
});

export const update = mutation({
  args: {
    id: v.id("routineTemplates"),
    name: v.optional(v.string()),
    emoji: v.optional(v.string()),
    color: v.optional(v.string()),
    steps: v.optional(v.array(stepValidator)),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("routineTemplates") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
