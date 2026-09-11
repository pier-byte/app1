import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const todoValidator = v.object({
  id: v.string(),
  text: v.string(),
  done: v.boolean(),
});

const noteFields = {
  title: v.string(),
  body: v.string(),
  type: v.string(), // note | todo
  todos: v.array(todoValidator),
  pinned: v.boolean(),
  color: v.string(),
};

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("notes").collect();
    return rows.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  },
});

export const create = mutation({
  args: { ...noteFields, createdAt: v.optional(v.number()), updatedAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("notes", {
      ...args,
      createdAt: args.createdAt ?? now,
      updatedAt: args.updatedAt ?? now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    type: v.optional(v.string()),
    todos: v.optional(v.array(todoValidator)),
    pinned: v.optional(v.boolean()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, { ...clean, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
