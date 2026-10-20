# KRSI — UI Integration Guide

How to connect the `krsi/Dashboard` React app (Vite + React 19 + React Router 7 + Tailwind) to the KRSI backend.
Today every screen reads hard-coded arrays (`data/warehouses.ts`, `seed` rows, `insights`, `activity` …) and the sign-up screens only write
to `sessionStorage`. This guide replaces each of those with API calls, screen by screen, and adds the screens the
warehouse owner and auditor personas need.

Everything referenced here is ready to copy from [`docs/ui-client/src`](ui-client/src):

| File | What it gives you |
|---|---|
| `api/types.ts` | TypeScript types for every request/response |
| `api/client.ts` | `fetch` wrapper: base URL, bearer token, envelope unwrapping, `ApiRequestError`, 401 handling, authenticated downloads |
| `api/endpoints.ts` | `api.*` — one typed function per endpoint |
| `auth/AuthContext.tsx` | `AuthProvider`, `useAuth()`, `RequireAuth` route guard, `signupDraft` for the multi-screen sign-up |
| `lib/useApi.ts` | `useApi()` for loading data, `useAction()` for button clicks |
| `lib/format.ts` | dd/MM/yyyy ⇄ ISO dates, money/MT/Qtl formatting, status → pill label, extra pill tones |
| `vite-env.d.ts` | Types `VITE_API_URL` |

These files type-check under `strict` with React 19 / React Router 7.

---

## 1. Setup (15 minutes)

1. **Run the backend** (see the backend `README.md`): PostgreSQL + `mvn spring-boot:run`. It seeds demo data on first start.
2. **Copy the client** into the app:
   ```bash
   cp -R backend/docs/ui-client/src/* Dashboard/src/
   ```
   (merge `vite-env.d.ts` with yours if you already have one).
3. **Point the app at the API.** Either:
   - **Vite proxy (recommended for local dev, no CORS):** in `vite.config.ts`
     ```ts
     export default defineConfig({
       plugins: [react(), tailwindcss()],
       server: { proxy: { '/api': 'http://127.0.0.1:8080' } },
     })
     ```
     and leave `VITE_API_URL` unset (the client defaults to `/api`).
   - **Direct:** `.env.local` → `VITE_API_URL=http://127.0.0.1:8080/api`. The backend already allows `http://localhost:5173`.
4. **Wrap the app in the auth provider** (`main.tsx`) — it must sit *inside* `BrowserRouter` because it navigates on 401:
   ```tsx
   <BrowserRouter>
     <AuthProvider>
       <App />
     </AuthProvider>
   </BrowserRouter>
   ```
5. **Guard the private routes** (`App.tsx`). The landing page, sign-in/sign-up, Find Warehouse, Warehouse Details and
   Marketplace are public on the backend too, so keep them open:
   ```tsx
   const p = (el: ReactNode, roles?: Role[]) => <RequireAuth roles={roles}>{el}</RequireAuth>

   <Route path="/dashboard" element={p(<DashboardPage />)} />
   <Route path="/store/booking" element={p(<BookingRequestPage />)} />
   <Route path="/store/invoice" element={p(<StorageInvoicePage />)} />
   <Route path="/trade/enwr" element={p(<TradePage page="enwr" />, ['FARMER', 'MERCHANT'])} />
   <Route path="/trade/listing" element={p(<TradePage page="listing" />, ['FARMER', 'MERCHANT'])} />
   <Route path="/trade/bid" element={p(<TradePage page="bid" />, ['MERCHANT'])} />
   <Route path="/trade/history" element={p(<TradePage page="history" />, ['FARMER', 'MERCHANT'])} />
   {/* new screens, section 6 */}
   <Route path="/owner/warehouses" element={p(<MyWarehousesPage />, ['WAREHOUSE_OWNER'])} />
   <Route path="/owner/receipts" element={p(<OwnerReceiptsPage />, ['WAREHOUSE_OWNER'])} />
   <Route path="/audit/inspections" element={p(<InspectionsPage />, ['AUDITOR'])} />
   <Route path="/audit/warehouses" element={p(<WarehouseAuditsPage />, ['AUDITOR'])} />
   <Route path="/audit/ledger" element={p(<LedgerExplorerPage />, ['AUDITOR'])} />
   ```

Swagger UI at http://127.0.0.1:8080/swagger-ui.html lists every endpoint with "Try it out". Sign in with a demo user
(password `Krsi@1234`): farmer `9000000001`, merchant `9000000002`, warehouse owner `9000000003`, auditor `9000000004`.

---

## 2. API conventions

**Envelope.** Every response is `{ success, data, error, traceId, timestamp }`. `call()` returns `data` or throws
`ApiRequestError` with `error.code`, `error.message` (safe to show) and `error.details[]` (per-field validation messages).

**Auth.** `Authorization: Bearer <accessToken>` (12 h). `client.ts` stores the token in `localStorage` and adds the header.
Any 401 clears it and sends the user to `/login` (wired by `AuthProvider`).

**Lists** are paged: `{ items, page, size, totalItems, totalPages }`, zero-based `page`, `size` 1–100 (default 20; 12 for warehouses).

**Filters** are query parameters. Pass `undefined` for "All …" options — `toQuery()` drops empty values.

**Dates.** The API uses ISO `yyyy-MM-dd`; the UI shows `dd/MM/yyyy`. Use `toUiDate()` / `toApiDate()` from `lib/format.ts`.

**Units.** Bookings are in **quintal** (`quantityQtl`, matching "Quantity (in Quintal)" in Book Now) and also return `quantityMt`.
Receipts, listings, bids and trades are in **MT**. 10 Qtl = 1 MT.

**Money.** Amounts are numbers in `currency` (default `INR`). The mock-ups show `$`; use `money(value, currency)`.
Prices: `pricePerKg` on market cards (`/KG`), `…PerMt` on trade screens (`/MT`).

**Commodity names** must come from `GET /api/reference/commodities` (e.g. `Cardamom`, not `Cardamum`; `Black Pepper`).
Matching is case-insensitive. Each commodity carries its `imageUrl`, so `commodityImage()` in `data/bookings.ts` can go.

**Error codes** to handle:

| Code | HTTP | Typical cause → UI |
|---|---|---|
| `INVALID_REQUEST` | 400 | Form errors. Show `fieldMessage('quantityQtl')` under the field, else `message` |
| `UNAUTHORIZED` | 401 | Not signed in / expired; wrong phone or password on Sign In |
| `FORBIDDEN` | 403 | Wrong role for the action — hide the button (section 5) |
| `NOT_FOUND` | 404 | Unknown id, or a record that belongs to someone else |
| `CONFLICT` | 409 | Phone already registered; second active bid on one listing |
| `INVALID_STATE` | 409 | Action not allowed now (accept a rejected booking, list a receipt awaiting audit…) — show `message`, then reload |
| `OTP_INVALID` / `OTP_EXPIRED` | 400 / 410 | Wrong code / expired — offer "Resend" |
| `RATE_LIMITED` | 429 | OTP requested too often — `message` says how long to wait |
| `DEPENDENCY_UNAVAILABLE` | 503 / 0 | Backend or DB down, or no network |

Quote `traceId` in bug reports; it matches the server log lines.

---

## 3. Sign-up and sign-in

The flow stays exactly as designed: **Language → Category → Phone → OTP → Create Password → Dashboard**.
`signupDraft` (sessionStorage) carries the values between screens, replacing the `krsi-language` / `krsi-category` / `krsi-phone` keys.

### LanguagePage
```ts
function choose(label: string) {
  signupDraft.merge({ language: label })
  navigate('/signup/category')
}
```
(Optional: render cards from `api.reference.languages()`.)

### CategoryPage
The card ids already match the API (`farmer`, `trader`, `fpo`, `fpu`). **Add a fifth card for warehouse owners**
(`id: 'warehouse_owner'`, e.g. `/assets/warehouse.png`) — without it they cannot sign up. Auditors are created by the platform
(`GET /api/reference/categories` returns `selfSignup: false` for them).
```ts
function choose(id: Category) {
  signupDraft.merge({ category: id })
  navigate('/signup/phone')
}
```

### PhonePage
```ts
const send = useAction(api.auth.sendOtp)
async function submit(event: FormEvent) {
  event.preventDefault()
  const sent = await send.run(phone, 'SIGNUP')
  if (!sent) return                                      // show send.error?.message (CONFLICT -> link to /login)
  signupDraft.merge({ phone, challengeId: sent.challengeId, resendAfterSeconds: sent.resendAfterSeconds })
  if (sent.devOtp) console.info('Dev OTP:', sent.devOtp) // local only; absent when OTP_EXPOSE_IN_RESPONSE=false
  navigate('/signup/otp')
}
```
Validation: 10 digits starting 6–9 (`INVALID_REQUEST` with `details[0].field === 'phone'`). Disable the button while `send.busy`.

### OtpPage
```ts
const draft = signupDraft.read()
const [seconds, setSeconds] = useState(draft.resendAfterSeconds ?? 60)   // replaces the hard-coded 57
const verify = useAction(api.auth.verifyOtp)

async function submit(event: FormEvent) {
  event.preventDefault()
  const ok = await verify.run(draft.challengeId!, digits.join(''))
  if (!ok) return                         // OTP_INVALID: "Incorrect code. 3 attempts left." / OTP_EXPIRED
  signupDraft.merge({ verificationToken: ok.verificationToken })
  navigate('/signup/password')
}

async function resend() {                 // enable when seconds === 0
  const sent = await api.auth.sendOtp(draft.phone!, 'SIGNUP')
  signupDraft.merge({ challengeId: sent.challengeId })
  setSeconds(sent.resendAfterSeconds)
}
```
Use `phoneMasked` from the send response for "A code has been sent to ******3210".

### PasswordPage
```ts
const { acceptSession } = useAuth()
const signup = useAction(api.auth.signup)

async function submit(event: FormEvent) {
  event.preventDefault()
  const { verificationToken, category, language } = signupDraft.read()
  const session = await signup.run({ verificationToken: verificationToken!, password, confirmPassword: confirm,
                                     category: category!, language })
  if (!session) return   // fieldMessage('password'): "must be 8-72 characters with at least one letter and one digit"
  acceptSession(session)
  signupDraft.clear()
  navigate('/dashboard')
}
```
The token is valid for 15 minutes after OTP verification and only once. The design has no name field;
the API accepts an optional `fullName` here, and `PATCH /api/me` can set it later (the greeting falls back to the category label).

### LoginPage
```ts
const { login } = useAuth()
const action = useAction(login)
async function submit(event: FormEvent) {
  event.preventDefault()
  if (await action.run(phone, password)) navigate('/dashboard')
}
// action.error?.message -> "Phone number or password is incorrect"
```
Forgot password: `sendOtp(phone, 'RESET_PASSWORD')` → `verifyOtp` → `api.auth.resetPassword(token, pw, confirm)` → `acceptSession`.

---

## 4. Screen-by-screen

### Top bar and side nav (`DashboardShell.tsx`)
- Replace "Suraj Kumar / Farmer" with `user.displayName` / `user.categoryLabel` from `useAuth()`. Add a Sign out item → `logout()`.
- Filter the nav by `user.role` (section 5). `Get Loan` can link to `/trade/enwr` (loans are taken from a receipt).
- The global search box can route to `/marketplace?q=` or `/store?q=`.

### Home (`DashboardPage.tsx`) → `GET /api/dashboard`
```ts
const { data } = useApi(() => api.dashboard(), [])
```
| UI element | Field |
|---|---|
| "Good Morning, Suraj" | `data.displayName` |
| Location chip ("Dichaon Kalan") | `data.location` (set via `PATCH /api/me`) |
| Your Activity rows | `data.activity` → `tile.label`, `statValue(tile, data.currency)`; icons by `tile.key` (`storedProduce`, `activeLoan`, `totalSales`, `pendingRepayment`, …) |
| Market Prices cards | `data.marketPrices` → `commodity`, `grade`, `perKg(pricePerKg)`, `bestMarket`, `imageUrl` |
| Market Insights tabs | `api.market.insights('GAINERS' / 'LOSERS' / 'WATCHLIST')` → `commodity`, `money(pricePerKg)`, `pct(changePct)` |
| (new) To-do list | `data.tasks` → `title`, `subtitle`, link to `route` |
| Weather cards | not provided by the backend; keep static or call a weather API |

The activity rows differ per role (warehouse owners get capacity/occupancy/bookings/revenue, auditors get inspections/audits due),
so render the list generically. Hide the four action tiles that don't apply to the role.

### Find A Warehouse (`FindWarehousePage.tsx`) → `GET /api/warehouses`, `/warehouses/stats` — public
Replace the `warehouses` import and the client-side `useMemo` filter with a server query:
```ts
const radius = { 'Within 20 Km': 20, 'Within 30 Km': 30, 'Within 100 Km': 100 }[distance]
const query: WarehouseSearch = {
  q: appliedPlace || undefined,
  commodity: commodity === 'All Commodities' ? undefined : commodity,
  radiusKm: radius,
  maxAvailableMt: capacity === 'Up to 3,000 MT' ? 3000 : undefined,
  minAvailableMt: capacity === '3,500 MT and above' ? 3500 : undefined,
  sort: ({ Nearest: 'NEAREST', Capacity: 'CAPACITY', Name: 'NAME' } as const)[sort],
  size: 12,
}
const { data } = useApi(() => api.warehouses.search(query), [appliedPlace, distance, commodity, capacity, sort])
const { data: stats } = useApi(() => api.warehouses.stats(), [])
```
- **Distance** needs a search origin: pass `lat`/`lng` (e.g. from `navigator.geolocation`), or rely on the signed-in user's saved
  location (`PATCH /api/me { latitude, longitude }`). Without an origin `distanceKm` is `null` and `radiusKm` is ignored —
  show `district` in the distance badge instead. The "place" text box is a text search (`q`) over name/address/district/state/crops.
- Commodity dropdown: `api.reference.commodities()`.
- Card mapping: `warehouse.distance` → `distanceKm ? \`${distanceKm} Km\` : district`, `location` → `address`,
  `capacity` → `mt(availableCapacityMt)`, `crops`, `image` → `imageUrl`. Show "WDRA Registered" only when `wdraRegistered`,
  and add a "Verified" tick from `verified`.
- Stat tiles: `verifiedWarehouses` ("Verified Warehouse"), `mt(totalCapacityMt)`, `${qualityVerifiedPercent}%`, `statesCovered`.
- Paging: `data.totalPages`, `page` param.

### Warehouse Details (`WarehouseDetailPage.tsx`) → `GET /api/warehouses/{id}` — public
Delete `warehouseById`, `profile()`, and the `infrastructure` / `amenities` / `licenses` constants:
```ts
const { data: w, error } = useApi(() => api.warehouses.details(id), [id])   // 404 -> "Warehouse not found"
```
| UI | Field |
|---|---|
| Name, location, description | `name`, `address`, `description` |
| License badges | `licenses` (+ `verified` → "Verified Warehouse") |
| Gallery | `photos` |
| Total / Available / Occupancy / Rating | `totalCapacityMt`, `availableCapacityMt`, `occupancyMt`, `${rating}/5` |
| Warehouse Information | `legalName`, `code`, `type`, `operator`, `yearEstablished`, `totalAreaSqft`, `suitableFor`, `accessHours`, `connectivity` |
| Infrastructure Details | `infrastructure[]` (label/value rows) |
| Amenities | `amenities[]` |
| Location tab | `address`, `latitude`/`longitude` (map pin), `connectivity` |
| Nearby Warehouses tab | `api.warehouses.nearby(id)` (has `distanceKm` from this warehouse) |
| Reviews tab | `rating`, `ratingCount`; `latestAudit` (date, result, auditor) — ratings come from auditor visits |
| (new) Storage rate | `money(storageRatePerMtMonth, currency)` per MT / month |

**Book Now modal** → `POST /api/bookings` (farmers and merchants):
```ts
const { user } = useAuth()
const create = useAction(api.bookings.create)

async function submit(event: FormEvent) {
  event.preventDefault()
  if (!user) return navigate('/login')
  const preferredDate = toApiDate(date)
  if (!commodity || !quantity || !preferredDate) return setFormError('Commodity, quantity and date are required')
  const booking = await create.run({ warehouseId: w.id, commodity, quantityQtl: Number(quantity), preferredDate })
  if (booking) navigate('/store/booking')
}
```
- Commodity options: `w.crops` (already canonical names).
- Remove the silent fallbacks (`commodity || 'Wheat'`, `date || '21/09/2026'`); the API rejects missing values.
- The `<input type="date">` already produces `yyyy-MM-dd` — you can pass that straight through.
- Errors: "does not store X" (`INVALID_REQUEST`), "has only N MT free" (`INVALID_STATE`), date in the past.
- Delete `saveBooking` / `readBookings` in `data/bookings.ts`.

### Booking Request (`BookingRequestPage.tsx`) → `GET /api/bookings`
Same screen for every role: farmers/merchants see their requests, warehouse owners see requests for their warehouses, auditors see all.
```ts
const statusParam = { Pending: 'PENDING', Accepted: 'ACCEPTED', Rejected: 'REJECTED' }[status] as BookingStatus | undefined
const { data, reload } = useApi(() => api.bookings.search({
  q: applied || undefined, status: statusParam,
  commodity: commodity === 'All Commodities' ? undefined : commodity,
  date: date === 'Select Date' ? undefined : toApiDate(date),
}), [applied, status, commodity, date])
```
Add `Cancelled` and `Stored` (= `DEPOSITED`) to the status dropdown. Row mapping: `commodity`, `grade`, `imageUrl`, `warehouseName`,
`warehouseLocation`, `toUiDate(createdAt)` (Requested On), `qtl(quantityQtl)`, `statusLabel(status)`.
Build the commodity/date dropdowns from `api.reference.commodities()` and a date picker rather than from the rows on the page.

**The ⋮ Actions menu** depends on role and status:

| Who | Status | Menu items → call |
|---|---|---|
| Depositor | PENDING, ACCEPTED | Cancel → `api.bookings.cancel(id)` |
| Warehouse owner | PENDING | Accept → `accept(id, note)`; Reject → `reject(id, note)` |
| Warehouse owner | ACCEPTED | Record arrival → `deposit(id, { netWeightMt, grade, moisturePct })`; Reject |
| Anyone | DEPOSITED | View receipt → `/trade/enwr` (or the receipt details using `enwrId`) |
| Anyone | any | Ledger history → `api.bookings.ledger(id)` (section 7) |

Show `decisionNote` (e.g. a rejection reason) under the status pill. Call `reload()` after an action.
"Record arrival" opens a small modal: net weight in MT (default `quantityMt`), grade, moisture %. Its response
(`DepositResult`) contains the new receipt (status *Awaiting Audit*) and the first storage invoice.

### Storage Invoice (`StorageInvoicePage.tsx`) → `GET /api/invoices`
```ts
const { data, reload } = useApi(() => api.invoices.search({
  q: applied || undefined,
  status: status === 'All' ? undefined : (status.toUpperCase() as InvoiceStatus),
  commodity: commodityChip === 'All Commodities' ? undefined : commodityChip,
}), [applied, status, commodityChip])
```
- Status chips: All, Paid, Pending, Overdue, Cancelled (there is no Draft state; remove it). `OVERDUE` is computed by the server.
- The second chip row currently repeats statuses; make it commodity chips (from `api.reference.commodities()`).
- Columns: Commodity → `commodity`, `${mt(quantityMt)} - ${grade}`, `invoiceNo`; Warehouse → `warehouseName`;
  Storage Period → `${toUiDate(periodFrom)} – ${toUiDate(periodTo)}`; Charges → `${money(ratePerMtMonth)}/MT/month`;
  Total Amount → `money(amount, currency)`; Status → `statusLabel(status)`.
- **View Details** → `api.invoices.get(id)` (or reuse the row) — show `receiptNo`, `dueDate`, `paidAt`, `paymentRef`, `ledgerHash`.
- **Download** → `api.invoices.download(id)` (opens a printable HTML invoice; "Save as PDF" from the browser).
- **Pay** (depositor, Pending/Overdue) → `api.invoices.pay(id, paymentRef)`. No gateway is connected yet; pass the gateway reference when you add one.
- **Cancel** (warehouse owner, Pending) → `api.invoices.cancel(id)`.

### Marketplace (`MarketplacePage.tsx`) → `GET /api/marketplace` — public
```ts
const { data: filters } = useApi(() => api.marketplace.filters(), [])   // { regions, grades } for the dropdowns
const { data } = useApi(() => api.marketplace.search({
  q: query || undefined,
  category: chips[chip] === 'All' ? undefined : chips[chip],
  region: region === 'All Region' ? undefined : region,
  grade: grade === 'All Grades' ? undefined : grade,
  maxQuantityMt: quantity === 'Under 1000 MT' ? 1000 : undefined,
  verifiedOnly,
  sort: ({ Latest: 'LATEST', Name: 'NAME', Price: 'PRICE_LOW' } as const)[sort],
}), [query, chip, region, grade, quantity, verifiedOnly, sort])
```
Category chips must match the server's categories: `Grain`, `Pulses`, `Oilseeds`, `Spices`, `Coffee & Tea` (the chips array lists
"Coffee & Tea" twice — drop the duplicate). Region options are warehouse districts (e.g. "Lalitpur, UP").

**LotCard** mapping: location → `region`; name → `commodity`; price → `perMt(askingPricePerMt)`; Available → `mt(quantityMt)`;
Quality → `grade`; Min. Order → `mt(minQuantityMt)`; image → `imageUrl`; badge → `warehouseVerified`; "N offers" → `offers`.

- **View Details** → `api.marketplace.lot(id)` (also `validTill`, `receiptDaysRemaining`, `warehouseName`, `sellerName`, `bestBidPerMt`).
- **Buy / Request Quote** (merchants only; for others show "Sign in as a buyer") → a bid modal:
  ```ts
  const bid = await placeBid.run(lot.id, { quantityMt: Number(qty), pricePerMt: Number(price) })
  ```
  Quantity must be between `minQuantityMt` and `quantityMt`; one active bid per buyer per listing (`CONFLICT`).
- Right column: Market Insights as on the dashboard; Your Activity from `api.dashboard().activity` when signed in.

### Trade → My eNWR (`TradePage` `page="enwr"`) → `GET /api/enwrs`
```ts
const { data, reload } = useApi(() => api.enwrs.search({
  q: applied || undefined, commodity: chip === 'All eNWR' ? undefined : chip,
}), [applied, chip])
```
| Column | Field |
|---|---|
| Commodity / Details | `imageUrl`, `commodity`, `grade`, `receiptNo` |
| Warehouse | `warehouseName` |
| Quantity | `mt(quantityMt)` |
| Stored On | `toUiDate(storedOn)` |
| Valid Till | `${daysRemaining} Days` |
| Asking Price / Total Value | `perMt(marketPricePerMt)` / `money(estimatedValue)` (market value; the receipt's own asking price lives on its listing) |
| Min. Quantity | from the listing when `activeListingId` is set, otherwise "-" |
| Status (add a column) | `statusLabel(status)` — Awaiting Audit, Active, Listed, Pledged … |

Drive the three buttons from `row.actions`:
- **View Details** → details drawer with quality data (`moisturePct`, `foreignMatterPct`, `qualityRemarks`, `inspectedBy`) and the
  ledger timeline (`api.enwrs.ledger(id)`).
- **Apply For Loan** (`actions.canApplyLoan`) → `api.loans.eligibility(id)` → show `maxAmount`, `interestRatePct` → `api.loans.apply(id, amount)`.
  The receipt becomes *Pledged*. Repay from a "My Loans" list (`api.loans.mine()`, `api.loans.repay(id, amount)`); the
  "Pending Repayment" row on the dashboard updates.
- **List On Market** (`actions.canList`) → modal with asking price per MT, minimum quantity, validity days →
  `api.listings.create({ enwrId, askingPricePerMt, minQuantityMt, validDays })`. The receipt becomes *Listed*.

Chips: build from `api.reference.commodities()` (the mock-up's Wheat/Maize/Barley/Coffee are placeholders).

### Trade → My Listing (`page="listing"`) → `GET /api/listings/mine`, `/listings/mine/stats`
- Stat cards: `api.listings.stats()` returns four `StatTile`s (Active Listings, Total Listed Quantity, Total Asking Value,
  Offers Received) with `note` such as "+2 this week". Render with `statValue()`.
- Chips → `status`: All Listings → undefined, Active → `ACTIVE`, Under Offer → `UNDER_OFFER`, Sold → `SOLD`, Expired → `EXPIRED`.
- Columns: as eNWR plus Asking Price → `perMt(askingPricePerMt)`, Offers → `offers`, Status → `statusLabel(status)`;
  Quantity shows what is left (`quantityMt` of `originalQuantityMt`).
- **View Details** → `api.listings.get(id)`; **Edit Listing** → `api.listings.update(id, { askingPricePerMt, minQuantityMt, validDays })`;
  **View Offer** → `api.listings.bids(id)` with **Accept** (`api.bids.accept(bidId)`) and **Reject** (`api.bids.reject(bidId)`) per bid;
  add **Withdraw** → `api.listings.withdraw(id)`.
- Accepting returns a `Settlement` `{ trade, listing, buyerReceipt }`. A partial bid splits the receipt: the buyer gets a new receipt
  and the listing keeps the rest; bids that no longer fit are rejected automatically. Show a confirmation with `trade.code`,
  `money(trade.totalValue)` and `shortHash(trade.ledgerHash)`.

### Trade → My Bid (`page="bid"`, merchants) → `GET /api/bids/mine`, `/bids/mine/stats`
- Stat cards from `api.bids.stats()` (Active Bids, Total Bid Value, Successful Bids, Pending Response).
- Columns: Bid Price → `perMt(pricePerMt)`, Total Bid Value → `money(totalValue)`, Status → Active / Accepted / Rejected / Withdrawn.
- **View Details** → `api.bids.get(id)`; add **Withdraw** for ACTIVE bids → `api.bids.withdraw(id)`.
- Accepted bids have `tradeId`; the bought receipt appears in the buyer's My eNWR list.

### Trade → Trade History (`page="history"`) → `GET /api/trades/mine`
Replace "No trade history yet." with a table: `code`, `side` (BUY/SELL), `commodity`, `mt(quantityMt)`, `perMt(pricePerMt)`,
`money(totalValue)`, counterparty (`side === 'BUY' ? sellerName : buyerName`), `toUiDate(settledAt)`, `shortHash(ledgerHash)`
linking to `api.trades.ledger(id)`.

---

## 5. Role-based navigation

| Menu item | Farmer | Merchant | Warehouse owner | Auditor |
|---|:-:|:-:|:-:|:-:|
| Home `/dashboard` | ✓ | ✓ | ✓ | ✓ |
| Store › Find Warehouse | ✓ | ✓ | ✓ | ✓ |
| Store › Booking Request | ✓ (own) | ✓ (own) | ✓ (incoming) | ✓ (all, read-only) |
| Store › Storage Invoice | ✓ (billed to me) | ✓ | ✓ (my warehouses) | ✓ |
| Get Loan / My Loans | ✓ | ✓ | | |
| Trade › My eNWR | ✓ | ✓ | | |
| Trade › My Listing | ✓ | ✓ | | |
| Trade › My Bid | | ✓ | | |
| Trade › Trade History | ✓ | ✓ | | |
| Marketplace | ✓ (view) | ✓ (bid) | ✓ (view) | ✓ (view) |
| My Warehouses / Stored Receipts (new) | | | ✓ | |
| Inspections / Warehouse Audits / Ledger (new) | | | | ✓ |

```ts
const { user } = useAuth()
const can = (...roles: Role[]) => !!user && roles.includes(user.role)
{can('FARMER', 'MERCHANT') && <NavLink to="/trade/enwr">Trade</NavLink>}
```
The backend enforces the same rules (403 `FORBIDDEN`); hiding the buttons just avoids showing actions that would fail.

---

## 6. New screens for the warehouse owner and the auditor

The mock-ups cover the farmer/merchant journey. These screens complete the other two personas; reuse the existing
`RequestLayout`, table rows, `StatusPill` and modal styles.

### Warehouse owner
| Screen | Calls |
|---|---|
| **My Warehouses** `/owner/warehouses` | `api.warehouses.mine()`; "Add warehouse" / "Edit" form → `create(body)` / `update(id, body)` (`WarehouseUpsert`: name, legal name, registration code, operator, address, district, state, lat/lng, total capacity MT, storage rate per MT per month, crops from `/reference/commodities`, amenities, licenses, photo URLs, infrastructure rows). New warehouses start unverified until an auditor passes them. |
| **Booking Request** (existing) | Accept / Reject / Record arrival from the ⋮ menu (section 4) |
| **Stored Receipts** `/owner/receipts` | `api.enwrs.search({ warehouseId })`; per row: **Bill next period** → `api.enwrs.billNextPeriod(id)`; **Release stock** (`actions.canRelease`) → `api.enwrs.release(id)` (fails with `INVALID_STATE` while invoices are unpaid or the receipt is listed/pledged) |
| **Storage Invoice** (existing) | Same list scoped to the owner's warehouses; **Cancel** unpaid invoices |

### Auditor
| Screen | Calls |
|---|---|
| **Inspections** `/audit/inspections` | `api.enwrs.pendingInspection()`; inspect modal → `api.enwrs.inspect(id, { decision: 'APPROVE' \| 'REJECT', grade, moisturePct, foreignMatterPct, remarks })`. APPROVE makes the receipt tradable; REJECT frees capacity and cancels unpaid invoices. |
| **Warehouse Audits** `/audit/warehouses` | `api.audits.due(90)` (not audited in 90 days) and `api.audits.recent()`; audit form → `api.warehouses.audit(id, { result, rating, stockVerifiedMt, findings })`. The response shows `stockRecordedMt` (receipts on record) and `varianceMt`. PASSED sets the warehouse's Verified badge; FAILED removes it. |
| **Ledger** `/audit/ledger` | "Verify chain" → `api.ledger.verify()` (green "Chain intact · N blocks" or red "Altered at block H: problem"); block list → `api.ledger.blocks(50, beforeHeight)` (infinite scroll by passing the last height); lookup → `api.ledger.entity(type, id)` |

The auditor's dashboard `tasks` link to `/audit/inspections` and `/store/<warehouseId>`.

---

## 7. Showing the blockchain trail

Every record returned by the API has `ledgerHash`: the hash of the latest ledger block that changed it. Two patterns:

**1. A "Recorded on ledger" chip** next to IDs (receipts, trades, invoices, audits):
```tsx
<button onClick={() => openTimeline('ENWR', row.id)} className="text-[12px] text-[#1F8955]">
  ⛓ {shortHash(row.ledgerHash)}
</button>
```

**2. A provenance timeline** from `GET …/{id}/ledger` (or `api.ledger.entity(type, id)`):
```tsx
const { data: proof } = useApi(() => api.enwrs.ledger(id), [id])
<p>{proof?.intact ? '✓ Untampered' : '⚠ Record altered outside the app'}</p>
{proof?.blocks.map((b) => (
  <li key={b.height}>
    <strong>{b.eventType.replaceAll('_', ' ').toLowerCase()}</strong> · {new Date(b.timestamp).toLocaleString('en-IN')}
    <code title={b.hash}>#{b.height} {shortHash(b.hash)}</code> by {shortHash(b.actorAddress)}
  </li>
))}
```
A receipt's timeline (`GET /enwrs/{id}/ledger`) includes its own blocks *and* every listing, trade, split, invoice and loan
block that references it, so it reads: produce deposited → invoice issued → eNWR issued (grade, moisture) → listing created →
trade settled → eNWR split / transferred → loan sanctioned → … Payloads contain ids, quantities and prices — never phone numbers — and users appear by their ledger
address (`user.walletAddress`; show it on the profile).

---

## 8. Formatting and status pills

Add `extraTones` from `lib/format.ts` to the `tones` map in `RequestLayout.tsx` and always pass `statusLabel(apiStatus)` to `StatusPill`:

| API status | Label | Used by |
|---|---|---|
| `PENDING` / `ACCEPTED` / `REJECTED` / `CANCELLED` | Pending / Accepted / Rejected / Cancelled | bookings, invoices |
| `DEPOSITED` | Stored | bookings |
| `PENDING_AUDIT` / `ACTIVE` / `LISTED` / `PLEDGED` / `SOLD` / `RELEASED` | Awaiting Audit / Active / Listed / Pledged / Sold / Released | receipts |
| `UNDER_OFFER` / `WITHDRAWN` / `EXPIRED` | Under Offer / Withdrawn / Expired | listings, bids |
| `OVERDUE` / `PAID` | Overdue / Paid | invoices |
| `CLOSED` | Closed | loans |

Images: use `imageUrl` from the API (paths like `/assets/coffee.png` that already exist in `public/assets`).

---

## 9. Loading, empty and error states

```tsx
const { data, loading, error, reload } = useApi(() => api.bookings.search(filters), [filters])
if (loading && !data) return <TableSkeleton />
if (error) return <ErrorBanner message={error.message} traceId={error.traceId} onRetry={reload} />
if (data && data.items.length === 0) return <p>No booking requests match these filters.</p>
```
Keep the existing "No … match these filters." copy for empty results. For buttons use `useAction` and disable while `busy`;
after `INVALID_STATE`, show the message and `reload()` — someone else probably changed the record.

---

## 10. End-to-end test script (demo data)

1. **Farmer** (9000000001): Dashboard shows Stored Produce, Active Loan ₹10,00,000, Total Sales ₹25,50,000.
   Booking Request lists six bookings in every state. My eNWR: Coffee (Listed, 40 MT), Turmeric (Pledged), Cumin (Awaiting Audit).
2. **Auditor** (9000000004): Inspections shows Cumin → Approve, grade "Grade A". Ledger → Verify chain → intact.
3. **Farmer**: Cumin is now Active → List On Market at ₹2,70,000/MT, minimum 10 MT.
4. **Merchant** (9000000002): Marketplace → Spices → Cumin lot → bid 20 MT at ₹2,65,000.
5. **Farmer**: My Listing → View Offer → Accept → 30 MT left on the listing; merchant now holds a 20 MT Cumin receipt.
6. **Farmer**: Book Now at Nayak Warehouse (Wheat, 120 Qtl). **Owner** (9000000003): Accept → Record arrival.
   **Auditor**: inspect it. **Farmer**: Storage Invoice → Pay.
7. **Farmer**: My eNWR → Cumin → View Details → timeline shows deposit, invoice, issue, listing, trade and split blocks, all intact.
   **Auditor**: Ledger → Verify chain → intact.

Reset to the original demo data by recreating the database (`dropdb krsi && createdb krsi -O krsi`) and restarting.

---

## 11. Endpoint reference

| Method | Path | Who | Screen |
|---|---|---|---|
| POST | `/auth/otp/send` | public | Phone / OTP resend |
| POST | `/auth/otp/verify` | public | OTP |
| POST | `/auth/signup` | public | Create Password |
| POST | `/auth/login` | public | Sign In |
| POST | `/auth/password/reset` | public | Forgot password |
| GET / PATCH | `/me` | signed in | Top bar, profile |
| GET | `/reference/categories`, `/reference/languages`, `/reference/commodities` | public | Sign-up, dropdowns |
| GET | `/dashboard` | signed in | Home |
| GET | `/market/prices`, `/market/insights?type=` | public | Market Prices, Market Insights |
| PUT / DELETE | `/market/watchlist/{commodity}` | signed in | Watchlist |
| GET | `/warehouses`, `/warehouses/stats`, `/warehouses/{id}`, `/warehouses/{id}/nearby` | public | Find Warehouse, Details |
| GET | `/warehouses/mine` | owner | My Warehouses |
| POST / PUT | `/warehouses`, `/warehouses/{id}` | owner | Add / edit warehouse |
| GET / POST | `/warehouses/{id}/audits` | signed in / auditor | Audit history / record audit |
| POST | `/bookings` | farmer, merchant | Book Now |
| GET | `/bookings`, `/bookings/{id}`, `/bookings/{id}/ledger` | signed in (scoped) | Booking Request |
| POST | `/bookings/{id}/accept`, `/reject`, `/deposit` | owner | Booking actions |
| POST | `/bookings/{id}/cancel` | depositor | Booking actions |
| GET | `/enwrs`, `/enwrs/{id}`, `/enwrs/{id}/ledger` | signed in (scoped) | My eNWR |
| GET | `/enwrs/pending-inspection` | auditor | Inspections |
| POST | `/enwrs/{id}/inspection` | auditor | Inspect |
| POST | `/enwrs/{id}/release`, `/enwrs/{id}/invoices` | owner | Release stock, bill next period |
| GET | `/marketplace`, `/marketplace/filters`, `/marketplace/{id}` | public | Marketplace |
| POST | `/listings` | farmer, merchant | List On Market |
| GET | `/listings/mine`, `/listings/mine/stats` | farmer, merchant | My Listing |
| GET / PATCH | `/listings/{id}` | signed in / seller | View / Edit Listing |
| POST | `/listings/{id}/withdraw` | seller | Withdraw |
| GET | `/listings/{id}/bids` | seller | View Offer |
| POST | `/listings/{id}/bids` | merchant | Buy / Request Quote |
| GET | `/bids/mine`, `/bids/mine/stats`, `/bids/{id}` | merchant | My Bid |
| POST | `/bids/{id}/accept`, `/bids/{id}/reject` | seller | View Offer |
| POST | `/bids/{id}/withdraw` | buyer | My Bid |
| GET | `/trades/mine`, `/trades/{id}`, `/trades/{id}/ledger` | signed in | Trade History |
| GET | `/invoices`, `/invoices/{id}`, `/invoices/{id}/download` | signed in (scoped) | Storage Invoice |
| POST | `/invoices/{id}/pay` / `/cancel` | depositor / owner | Storage Invoice |
| GET | `/loans/eligibility?enwrId=`, `/loans/mine`, `/loans/{id}` | farmer, merchant | Apply For Loan, My Loans |
| POST | `/loans`, `/loans/{id}/repay` | farmer, merchant | Apply / Repay |
| GET | `/ledger/verify`, `/ledger/blocks` | auditor | Ledger |
| GET | `/ledger/entities/{type}/{id}` | signed in | Any timeline |
| GET | `/audits`, `/audits/due` | auditor | Warehouse Audits |
| GET | `/health` | public | Status banner |

All paths are relative to the API base (`/api`).
