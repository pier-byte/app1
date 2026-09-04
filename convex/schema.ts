import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── TAB 1: Scuola ──
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    categoryColor: v.string(),
    date: v.string(),
    completed: v.boolean(),
    estimatedMinutes: v.optional(v.number()),
    actualMinutes: v.optional(v.number()),
    priority: v.optional(v.number()),
  })
    .index("by_date", ["date"])
    .index("by_category", ["category"]),

  taskCategories: defineTable({
    name: v.string(),
    color: v.string(),
    order: v.number(),
  }),

  // ── TAB 2: Routine ──
  routines: defineTable({
    date: v.string(),
    steps: v.array(
      v.object({
        name: v.string(),
        targetMinutes: v.number(),
        actualSeconds: v.optional(v.number()),
        completed: v.boolean(),
      })
    ),
    startedAt: v.optional(v.string()),
    completedAt: v.optional(v.string()),
  }).index("by_date", ["date"]),

  // ── TAB 3: Nutrizione ──
  meals: defineTable({
    date: v.string(),
    mealType: v.string(),
    description: v.string(),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    parsedByAI: v.boolean(),
  }).index("by_date", ["date"]),

  weeklyMealPlan: defineTable({
    weekStart: v.string(),
    plan: v.array(
      v.object({
        day: v.string(),
        colazione: v.string(),
        pranzo: v.string(),
        cena: v.string(),
        spuntino: v.optional(v.string()),
      })
    ),
  }).index("by_week", ["weekStart"]),

  bodyMetrics: defineTable({
    date: v.string(),
    weightKg: v.optional(v.number()),
    heightCm: v.optional(v.number()),
  }).index("by_date", ["date"]),

  // ── TAB 4: Wallet ──
  expenses: defineTable({
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),
  }).index("by_date", ["date"]),

  weeklyBudget: defineTable({
    weekStart: v.string(),
    budgetAmount: v.number(),
  }).index("by_week", ["weekStart"]),
});
