import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const reminderValidator = v.object({
  at: v.string(),
  label: v.string(),
  offsetKey: v.optional(v.string()),
  notified: v.optional(v.boolean()),
});

const repeatValidator = v.object({
  frequency: v.string(),
  weekdays: v.optional(v.array(v.number())),
  endMode: v.optional(v.string()),
  endAfter: v.optional(v.number()),
  endDate: v.optional(v.string()),
});

const attachmentValidator = v.object({
  name: v.string(),
  type: v.string(),
  size: v.optional(v.number()),
  dataUrl: v.optional(v.string()),
});

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
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  allDay: v.optional(v.boolean()),
  reminders: v.optional(v.array(reminderValidator)),
  repeat: v.optional(repeatValidator),
  attachments: v.optional(v.array(attachmentValidator)),
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

// ── Serie ricorrenti (mirror di src/lib/repeat.js, senza dipendenze esterne) ──

const MAX_SERIES = 365;

function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
function toKey(dt) {
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
function addDaysC(dt, n) {
  const d = new Date(dt);
  d.setDate(d.getDate() + n);
  return d;
}
// addMonths con clamp a fine mese (come date-fns): 31 gen → 28 feb → 31 mar
function addMonthsC(dt, n) {
  const day = dt.getDate();
  const d = new Date(dt.getFullYear(), dt.getMonth() + n, 1, 12, 0, 0, 0);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}
function isoWd(dt) {
  const g = dt.getDay();
  return g === 0 ? 7 : g;
}
function diffDays(a, b) {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ua - ub) / 86400000);
}
function hasRepeatC(repeat) {
  return !!repeat && !!repeat.frequency && repeat.frequency !== "none";
}
function stripUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

/** Tutte le date della serie, base inclusa come occorrenza #1 (max 365). */
function computeOccurrences(baseKey, repeat) {
  const base = parseKey(baseKey);
  if (Number.isNaN(base.getTime())) return [];
  if (!hasRepeatC(repeat)) return [baseKey];
  const freq = repeat.frequency;
  const endMode = repeat.endMode === "after" || repeat.endMode === "on" ? repeat.endMode : "never";
  const maxCount = endMode === "after" ? Math.max(1, Math.floor(repeat.endAfter || 5)) : Infinity;
  const endDate = endMode === "on" && repeat.endDate ? repeat.endDate : null;
  const windowEnd = endMode === "never" ? toKey(addDaysC(base, MAX_SERIES - 1)) : null;
  const out = [baseKey];
  const accept = (key) => {
    if (out.length >= MAX_SERIES || out.length >= maxCount) return "stop";
    if (endDate && key > endDate) return "stop";
    if (windowEnd && key > windowEnd) return "stop";
    out.push(key);
    return "ok";
  };
  if (freq === "monthly") {
    for (let k = 1; k <= 1200; k++) {
      if (accept(toKey(addMonthsC(base, k))) === "stop") break;
    }
    return out;
  }
  const days = repeat.weekdays?.length ? repeat.weekdays : [isoWd(base)];
  let cursor = addDaysC(base, 1);
  for (;;) {
    if (diffDays(cursor, base) > 366 * 3) break;
    const wd = isoWd(cursor);
    const match =
      freq === "daily" ||
      (freq === "weekdays" && wd >= 1 && wd <= 5) ||
      (freq === "weekly" && days.includes(wd));
    if (match && accept(toKey(cursor)) === "stop") break;
    cursor = addDaysC(cursor, 1);
  }
  return out;
}

/** Sposta i promemoria su un'altra data (stessa ora locale), azzera notified. */
function shiftRemindersC(reminders, toKeyStr) {
  if (!reminders) return reminders;
  const [y, m, d] = toKeyStr.split("-").map(Number);
  return reminders.map((r) => {
    const dt = new Date(r.at);
    if (Number.isNaN(dt.getTime())) return { ...r, notified: false };
    dt.setFullYear(y, m - 1, d);
    return { ...r, at: dt.toISOString(), notified: false };
  });
}

async function deleteSeriesChildren(ctx, parentId) {
  const kids = await ctx.db
    .query("tasks")
    .withIndex("by_series", (q) => q.eq("seriesId", parentId))
    .collect();
  for (const k of kids) {
    if (String(k._id) !== String(parentId)) await ctx.db.delete(k._id);
  }
}

async function insertSeriesChildren(ctx, parent, dates) {
  const stamp = parent.createdAt ?? Date.now();
  for (let i = 1; i < dates.length; i++) {
    await ctx.db.insert(
      "tasks",
      stripUndefined({
        title: parent.title,
        description: parent.description,
        category: parent.category,
        categoryColor: parent.categoryColor,
        date: dates[i],
        completed: false,
        estimatedMinutes: parent.estimatedMinutes,
        actualMinutes: 0,
        priority: parent.priority,
        startTime: parent.startTime,
        endTime: parent.endTime,
        allDay: parent.allDay,
        reminders: shiftRemindersC(parent.reminders, dates[i]),
        repeat: parent.repeat,
        attachments: [],
        seriesId: String(parent._id),
        materialized: true,
        createdAt: stamp + i,
      })
    );
  }
}

/** Update con rigenerazione della serie se cambia regola/data del parent. */
async function applyUpdate(ctx, id, patch) {
  const existing = await ctx.db.get(id);
  if (!existing) return;
  const clean = stripUndefined(patch);
  const isParent = !!existing.seriesId && String(existing.seriesId) === String(id);
  const repeatChanged =
    patch.repeat !== undefined &&
    JSON.stringify(patch.repeat ?? null) !== JSON.stringify(existing.repeat ?? null);
  const dateChanged = patch.date !== undefined && patch.date !== existing.date;
  if (isParent && (repeatChanged || dateChanged)) {
    await deleteSeriesChildren(ctx, String(id));
    const next = { ...existing, ...clean };
    if (hasRepeatC(next.repeat) && next.date) {
      await insertSeriesChildren(ctx, next, computeOccurrences(next.date, next.repeat));
      await ctx.db.patch(id, { ...clean, seriesId: String(id), materialized: true });
    } else {
      await ctx.db.patch(id, clean); // serie sciolta → torna istanza singola
    }
    return;
  }
  await ctx.db.patch(id, clean);
}

export const create = mutation({
  args: {
    ...taskFields,
    seriesId: v.optional(v.string()),
    materialized: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { createdAt, seriesId: _sid, materialized: _mat, ...fields } = args;
    const stamp = createdAt ?? Date.now();
    const parentId = await ctx.db.insert("tasks", stripUndefined({ ...fields, createdAt: stamp }));
    // Serie ricorrente → duplica subito tutte le istanze nel DB
    if (hasRepeatC(args.repeat) && fields.date) {
      const parent = await ctx.db.get(parentId);
      await insertSeriesChildren(ctx, parent, computeOccurrences(fields.date, args.repeat));
      await ctx.db.patch(parentId, { seriesId: String(parentId), materialized: true });
    }
    return parentId;
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
    actualMinutes: v.optional(v.number()),
    priority: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    allDay: v.optional(v.boolean()),
    reminders: v.optional(v.array(reminderValidator)),
    repeat: v.optional(repeatValidator),
    attachments: v.optional(v.array(attachmentValidator)),
  },
  handler: async (ctx, { id, ...patch }) => {
    await applyUpdate(ctx, id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/** Elimina un'intera serie ricorrente a partire da una sua istanza. */
export const removeSeries = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const target = await ctx.db.get(id);
    if (!target) return;
    const sid = target.seriesId;
    if (!sid) {
      await ctx.db.delete(id);
      return;
    }
    const all = await ctx.db
      .query("tasks")
      .withIndex("by_series", (q) => q.eq("seriesId", sid))
      .collect();
    for (const t of all) await ctx.db.delete(t._id);
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

/** Sposta il task (data passata dal client per coerenza di timezone). */
export const moveToDate = mutation({
  args: { id: v.id("tasks"), date: v.string() },
  handler: async (ctx, { id, date }) => {
    // Passa da applyUpdate: spostare il parent rigenera la serie
    await applyUpdate(ctx, id, { date });
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
