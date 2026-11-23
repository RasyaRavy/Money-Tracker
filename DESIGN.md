# DESIGN.md - Money Tracker (PWA)

## Design Read
Reading this as: personal finance ledger and budgeting PWA for Indonesian everyday users, in a tactile modern accounting book language, dial ENERGY 1 / RHYTHM 2 / MOTION 1.

## Identity & Character
- **Concept**: Buku Kas Pribadi Modern (Modern Personal Cashbook). Clear, calm, trustworthy, and fast.
- **Identity Motif**: Monospace tabular currency numbers (`font-mono tabular-nums`) paired with subtle dashed ledger rules (`border-dashed`) separating summary rows and totals, evoking a classic physical Indonesian *Buku Kas* translated into a responsive digital interface.
- **Focal Point per Screen**:
  - Dashboard (`/`): Net Balance & Monthly Cashflow Ledger Card at the top.
  - Transactions (`/transactions`): Search/Filter Control Bar leading directly into date-grouped ledger entries.
  - Budgets (`/budgets`): Monthly Total Budget Progress header card.
  - Reports (`/reports`): Monthly Net Surplus/Deficit & Category Breakdown.
  - Categories & Data (`/settings`): Two-column Category Manager & CSV Data Portability panel.

## One-Line Reasons for Major Decisions (R-31)
- **Why this color palette?**: Deep emerald (`#047857` light / `#10b981` dark) represents positive cashflow and growth, warm rose (`#be123c` light / `#fb7185` dark) clearly flags expenses/deficits, and warm stone/zinc neutrals keep high contrast (>7:1 for body text) without eye strain in both light and dark modes.
- **Why this layout?**: A persistent left navigation rail on desktop (`lg`) and a thumb-zone bottom bar with a central `+ Catat` button on mobile/tablet ensures recording a new transaction is never more than one tap away.
- **Why this typography?**: Plus Jakarta Sans provides clean Indonesian text legibility for labels and notes, while JetBrains Mono (`tabular-nums`) aligns Rupiah figures vertically across rows and tables so users can compare amounts at a glance.
- **Why this spacing?**: A compact mobile scale (`p-4`, `gap-3`) transitions to a roomy desktop register (`p-6` to `p-8`, `gap-6`), reserving bottom safe-area clearance on mobile so fixed navigation never obscures transaction rows.
- **Why use cards?**: Cards group related financial metrics (such as a category's budget limit vs. actual spending) into distinct visual containers with solid 1px borders; flat elevation is default, and subtle shadow (`shadow-sm`) is reserved only for active modals and the floating quick-add trigger.
- **Why use these icons?**: Every category icon (e.g., `Utensils` for food, `Car` for transport, `Zap` for utilities, `Wallet` for salary) maps directly to the physical real-world category it represents so users can scan transaction lists faster than reading text alone.
- **Why use motion?**: Motion is strictly functional (Dial MOTION 1): smooth width transitions on budget progress bars and subtle hover/active background states on interactive controls, disabled automatically when `prefers-reduced-motion: reduce` is active.
