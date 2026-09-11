import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── TAB 1: Compiti / Eventi ──
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
    // Campi "evento" (screenshot 12_menu_allegati)
    startTime: v.optional(v.string()), // "HH:mm"
    endTime: v.optional(v.string()),
    allDay: v.optional(v.boolean()),
    reminders: v.optional(
      v.array(
        v.object({
          at: v.string(), // ISO datetime
          label: v.string(),
          offsetKey: v.optional(v.string()),
          notified: v.optional(v.boolean()),
        })
      )
    ),
    repeat: v.optional(
      v.object({
        frequency: v.string(), // none | daily | weekdays | weekly | monthly
        weekdays: v.optional(v.array(v.number())),
        endMode: v.optional(v.string()), // never | after | on
        endAfter: v.optional(v.number()),
        endDate: v.optional(v.string()),
      })
    ),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          type: v.string(),
          size: v.optional(v.number()),
          dataUrl: v.optional(v.string()),
        })
      )
    ),
    // Serie ricorrenti materializzate: ogni istanza è un documento reale.
    // Parent: seriesId = proprio _id; figlie: seriesId = _id del parent.
    seriesId: v.optional(v.string()),
    materialized: v.optional(v.boolean()),
  })
    .index("by_date", ["date"])
    .index("by_category", ["category"])
    .index("by_series", ["seriesId"]),

  taskCategories: defineTable({
    name: v.string(),
    color: v.string(),
    order: v.number(),
  }),

  // ── TAB 2: Routine ──
  routines: defineTable({
    date: v.string(),
    routineId: v.optional(v.string()),
    routineName: v.optional(v.string()),
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

  routineTemplates: defineTable({
    name: v.string(),
    emoji: v.optional(v.string()), // legacy: sostituito da `icon`
    icon: v.optional(v.string()), // nome icona lucide monocromatica
    color: v.string(),
    steps: v.array(
      v.object({
        name: v.string(),
        targetMinutes: v.number(),
      })
    ),
  }),

  // ── TAB 3: Nutrizione ──
  meals: defineTable({
    date: v.string(),
    mealType: v.string(),
    description: v.string(),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    caloriesSource: v.optional(v.string()), // macro | ai | manual
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

  // ── TAB 5: Note ──
  notes: defineTable({
    title: v.string(),
    body: v.string(),
    type: v.string(), // note | todo
    todos: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        done: v.boolean(),
      })
    ),
    pinned: v.boolean(),
    color: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_updated", ["updatedAt"]),

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
