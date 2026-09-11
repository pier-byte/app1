# app1 — PWA Gestione Personale

PWA ad alte prestazioni per la gestione personale: **Calendario**, **Compiti**, **Routine**, **Nutrizione**, **Note** e **Wallet**.
Design Apple Dark Mode, realtime con Convex DB, AI con Gemini 2.5 Flash, installabile su iOS/Android/Desktop.

![Stack](https://img.shields.io/badge/React_19-Vite_6-61dafb) ![PWA](https://img.shields.io/badge/PWA-vite--plugin--pwa-5a0fc8) ![DB](https://img.shields.io/badge/Convex-Realtime-f3b331) ![AI](https://img.shields.io/badge/Gemini-2.5_Flash-8e75b2) ![Hosting](https://img.shields.io/badge/Cloudflare_Pages-€0/mese-f38020)

## ✨ Funzionalità

### 🔐 Sicurezza
- **PIN Lock a 6 cifre** al primo avvio, validato **server-side** tramite mutation Convex sull'env `APP_PIN`
- Persistenza sessione in `localStorage`, tasti freccia supportati su desktop

### 📅 Tab 1 — Calendario (home)
- Vista **Mese fit-to-screen** (100dvh, niente scroll): pill colorate con stato check dentro ogni giorno, stile screenshot home
- **Tap sul giorno → DaySheet** (~metà schermo): check/uncheck rapido, modifica titolo inline, cambio categoria al volo, aggiunta rapida, elimina singola/serie
- Vista **Settimana** con strip + agenda con toggle bidirezionale; FAB → editor completo sulla data selezionata

### 🎓 Tab 2 — Compiti
- Strip settimanale (Lun–Dom) + lista attività del giorno con categorie colorate e checkbox
- **Editor completo stile iOS (screenshot 12)**: titolo/descrizione, scadenza, **tutto il giorno + orari**, **promemoria** (all'ora, 5/15/30 min prima, 1h/2h, giorno alle 09:00 → notifiche di sistema + banner in-app), **ripeti** (giornaliero, feriali, settimanale con giorni scelti, mensile + fine: mai / dopo N volte / in data), **elenco attività** (categorie personalizzabili) e **allegati** (foto, PDF, documenti)
- **Serie ricorrenti materializzate**: al salvataggio ogni occorrenza diventa un task reale nel DB (max 365) con promemoria spostati sulla data giusta; il picker mostra l'anteprima "Verranno create N attività". Ogni istanza resta indipendente (check/sposta/modifica singola); modificare la regola sulla prima occorrenza rigenera la serie
- Timer di studio 15:00–20:00, stima tempi e carico via Gemini 2.5 Flash
- Menu contestuale: Modifica, Sposta a domani, Cambia data, Elimina, Elimina l'intera serie

### 🔁 Tab 3 — Routine
- **Più schede** (template) con **attività personalizzabili dentro**: nome, icona monocromatica, colore, step con nome/obiettivo minuti, ordine, aggiunta/rimozione; **eliminazione scheda** con conferma
- **Vista panoramica "Tutte"**: griglia compatta di tutte le schede (icona, n° attività, durata) con avvio diretto
- **Icone vettoriali monocromatiche** (31 lucide, toni di grigio): 5 in primo piano + pulsante "+N" con libreria in modale blur; le vecchie emoji migrano in automatico
- Timer a scorrimento (carousel con scroll-snap) che registra i tempi effettivi per scheda
- Riepilogo con confronto tempi reali vs obiettivo e salvataggio automatico

### 🥗 Tab 4 — Nutrizione
- **Kcal ↔ macro sempre collegate (regola 4-4-9)**: P·4 + C·4 + G·9 = kcal. I macro sono la fonte, le kcal si aggiornano in automatico; ogni pasto mostra il calcolo
- Log macro/calorie via **prompt AI** ("150g pollo e riso" → Gemini estrae macro), con editor che evidenzia eventuali scostamenti
- **Calcolo obiettivo** (Mifflin-St Jeor): BMR, TDEE, target kcal per **mantenere / aumentare / diminuire peso**, con surplus suggerito (+250/+500 kcal → ~0,25–0,5 kg/settimana), proteine 1,6–2,2 g/kg e macro suggeriti. Un tap applica i target
- Tabella rotazione pasti Lun–Dom con swap rapido, grafici Peso/Altezza

### 📝 Tab 5 — Note
- **Note rapide e checklist stile Notion**: testo libero o to-do con checkbox, pin, colori, ricerca e filtro (tutte/note/to-do)

### 💰 Tab 6 — Wallet
- Budget settimanale, log rapido spese, indicatori di soglia 🟢 <50% · 🟡 50–80% · 🔴 >80%

### 📱 UX mobile (Android/iOS)
- Touch target ≥44px, stepper +/−, chip di scelta, picker data/ora **nativi del sistema** (tamburo iOS/Android, dark-mode, 16px/44px)
- Input ≥16px per evitare lo zoom automatico iOS, safe-area per notch e gesture bar, layout in `dvh`

### ⚡ Performance
- **Code-splitting**: ogni tab è un chunk lazy (`React.lazy` + `Suspense`), editor compiti lazy con preload intelligente, vendor separati (react/charts/motion/convex/genai)
- Prefetch delle altre tab quando il browser è inattivo; pre-bundle esplicito (`optimizeDeps`) per un `npm run dev` più veloce

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

### Notifiche promemoria (iOS/Android)
- Su **PWA** le notifiche locali programmate non esistono: l'app, quando è aperta, mostra notifica di sistema + banner in-app al momento del promemoria
- Su **iOS** l'app deve essere installata nella home e il permesso notifiche concesso
- Ogni istanza di una serie ricorrente ha i propri promemoria sulla data corretta

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
convex/              # schema + query/mutation (tasks, routines, routineTemplates, meals, mealPlan, bodyMetrics, notes, wallet)
src/
├── components/
│   ├── auth/        # PinScreen
│   ├── layout/      # AppShell, WeekStrip (calendario swipeable), BottomNav
│   ├── ui/          # BottomSheet, Dialog, ContextMenu, FAB, EmptyState, SegmentedControl, Toggle
│   ├── school/      # StudyTimerCard, TaskCard, TaskFormSheet (promemoria/ripeti/allegati), ReminderPicker, RepeatPicker, AttachmentList, LoadInsightCard
│   ├── calendar/    # MonthGrid (fit-to-screen), DaySheet (gestione rapida giorno)
│   ├── routine/     # RoutineCarousel, RoutineIcon, IconPicker
│   ├── nutrition/   # AiMealInput, GoalPlannerDialog (BMR/TDEE/macro), WeeklyPlanTable, MetricsCharts
│   ├── notes/       # NoteEditorSheet
│   └── wallet/      # ExpenseFormSheet
├── hooks/           # useAuth, useData (Convex↔locale, ripetizioni), useDateNavigation, useSwipeNavigation, useTimer
├── pages/           # CalendarPage, SchoolPage, RoutinePage, NutritionPage, NotesPage, WalletPage
├── store/           # studyTimer, routineSession (singleton persistenti)
└── lib/             # constants, dates, repeat, nutritionMath, notifications, gemini, localStore, db, cn
scripts/             # generate-icons.mjs, smoke-test.mjs
```

## 🧪 Test

```bash
node scripts/smoke-test.mjs   # rendering SSR pagine/componenti + ripetizioni + serie (23 test)
```
