# app1 — PWA Gestione Personale

PWA ad alte prestazioni per la gestione personale: **Scuola**, **Routine**, **Nutrizione** e **Wallet**.
Design Apple Dark Mode, realtime con Convex DB, AI con Gemini 2.5 Flash, installabile su iOS/Android/Desktop.

![Stack](https://img.shields.io/badge/React_19-Vite_6-61dafb) ![PWA](https://img.shields.io/badge/PWA-vite--plugin--pwa-5a0fc8) ![DB](https://img.shields.io/badge/Convex-Realtime-f3b331) ![AI](https://img.shields.io/badge/Gemini-2.5_Flash-8e75b2) ![Hosting](https://img.shields.io/badge/Cloudflare_Pages-€0/mese-f38020)

## ✨ Funzionalità

### 🔐 Sicurezza
- **PIN Lock a 6 cifre** al primo avvio, validato **server-side** tramite mutation Convex sull'env `APP_PIN`
- Persistenza sessione in `localStorage`, tasti freccia supportati su desktop

### 🎓 Tab 1 — Scuola
- Timer di studio con finestra **15:00–20:00**, pausa/ripresa e ripristino dopo reload
- Attribuzione dei minuti studiati a un compito alla chiusura della sessione
- Task categorizzati (Studiare, Esercizi, Verifica…) con colori
- **Stima tempi** e **analisi carico** via Gemini 2.5 Flash
- Menu contestuale per task: **Modifica, Sposta a domani, Cambia data, Elimina**

### 🔁 Tab 2 — Routine
- Sequence post-volley: Doccia → Capelli → Skincare → Denti → Cena
- **Timer a scorrimento** (carousel con scroll-snap) che registra i tempi effettivi
- Riepilogo con confronto tempi reali vs obiettivo, salvataggio automatico

### 🥗 Tab 3 — Nutrizione
- **Log macro/calorie via prompt AI**: scrivi *"150g pollo e riso"* → Gemini estrae kcal e macro
- **Tabella rotazione pasti** Lun–Dom con **swap rapido** dei giorni (modalità scambia)
- Grafici **Peso (kg)** e **Altezza (cm)** con storico

### 💰 Tab 4 — Wallet
- Budget settimanale impostabile con quick-pick
- Log rapido spese (importo grande, categoria, data)
- Indicatori visivi di soglia: 🟢 <50% · 🟡 50–80% · 🔴 >80%

## 🚀 Avvio rapido

```bash
npm ci                      # installa le dipendenze
cp .env.example .env.local  # configura le env (vedi sotto)
npm run dev                 # http://localhost:5173
```

> Senza `VITE_CONVEX_URL` l'app funziona in **modalità demo** (dati in localStorage).
> Senza `VITE_GEMINI_API_KEY` le funzioni AI sono disattivate ma l'app resta usabile.

## 🔧 Configurazione

### Convex DB (realtime)
```bash
npx convex dev              # crea il progetto e genera convex/_generated
npx convex env set APP_PIN 123456   # PIN server-side (6 cifre)
```
Poi incolla l'URL del deployment in `VITE_CONVEX_URL` e ridistribuisci.

### Gemini AI
Chiave gratuita su [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → `VITE_GEMINI_API_KEY`.

> Nota: la chiave è client-side (app personale, costi €0 col free tier). Per produzione multi-utente si raccomanda un proxy.

## ☁️ Deploy su Cloudflare Pages

```bash
npm run build               # genera dist/ (+ service worker PWA)
npx wrangler pages deploy dist
```

Oppure dal dashboard Cloudflare:
- **Build command:** `npm run build`
- **Output:** `dist`
- **Env vars:** `VITE_CONVEX_URL`, `VITE_GEMINI_API_KEY`, `VITE_APP_PIN`

`public/_headers` include già cache immutabile per gli asset e security headers.

## 📱 Installazione PWA

- **iOS:** Safari → Condividi → *Aggiungi alla schermata Home*
- **Android/Desktop:** Chrome → icona *Installa* nella barra indirizzi

## 🗂 Struttura

```
convex/              # schema + query/mutation (tasks, routines, meals, mealPlan, bodyMetrics, wallet)
src/
├── components/
│   ├── auth/        # PinScreen
│   ├── layout/      # AppShell, WeekStrip (calendario swipeable), BottomNav
│   ├── ui/          # BottomSheet, Dialog, ContextMenu, FAB, EmptyState, SegmentedControl, Toggle
│   ├── school/      # StudyTimerCard, TaskCard, TaskFormSheet, DatePickerDialog, LoadInsightCard
│   ├── routine/     # RoutineCarousel
│   ├── nutrition/   # AiMealInput, WeeklyPlanTable, MetricsCharts
│   └── wallet/      # ExpenseFormSheet
├── hooks/           # useAuth, useData (Convex↔locale), useDateNavigation, useSwipeNavigation, useTimer
├── pages/           # SchoolPage, RoutinePage, NutritionPage, WalletPage
├── store/           # studyTimer, routineSession (singleton persistenti)
└── lib/             # constants (design tokens), dates, gemini, localStore, db, cn
scripts/             # generate-icons.mjs, smoke-test.mjs
```

## 🧪 Test

```bash
node scripts/smoke-test.mjs   # rendering SSR di tutte le pagine/componenti (13 test)
```
