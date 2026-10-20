# KRSI Backend

Spring Boot 4 / Java 17 backend for the KRSI crop storage and trading app. It serves four personas:

| Persona | Sign-up category | What they do |
|---|---|---|
| **Farmer** | `farmer`, `fpo` | Book storage, hold warehouse receipts (eNWR), list them for sale, take loans, pay storage invoices |
| **Merchant** | `trader`, `fpu` | Browse the marketplace, bid on receipts, receive receipts when a bid is accepted, resell |
| **Warehouse owner** | `warehouse_owner` | Register warehouses, accept/reject bookings, record arrivals, bill storage, release stock |
| **Auditor** | `auditor` (created by the platform) | Quality-inspect deposits before receipts go live, audit warehouses, verify the ledger |

Built on the same conventions as the Payment Failure Analyzer: layered `controller / service / repository / dto / model`,
`JdbcTemplate` + PostgreSQL with an idempotent `schema.sql`, the `{ success, data, error, traceId, timestamp }` envelope,
`X-Trace-Id` correlation, typed `AppProperties`, and Swagger UI.

## The blockchain part

Every state change (booking, deposit, inspection, listing, bid, trade, invoice, loan, audit) appends a block to a
**SHA-256 hash chain** (`ledger_blocks`) in the *same database transaction* as the change. Each block's hash covers its
content and the previous block's hash, so editing or deleting any past record breaks `GET /api/ledger/verify`
and the affected record's `.../ledger` proof. Users appear on the ledger only as an address (`0x…`), never by phone number.

`BlockchainLedger` is an interface. To anchor on a public or permissioned chain (Polygon, Hyperledger Fabric …), add an
implementation or periodically publish the head hash from `/api/ledger/verify` to that chain.

## Lifecycle

```
Farmer: Book Now ──► Owner: accept ──► Owner: record arrival ──► Auditor: inspect ──► eNWR ACTIVE
          (PENDING)      (ACCEPTED)       (DEPOSITED, eNWR PENDING_AUDIT,             │
                                           first storage invoice)                      ├─► List On Market ─► Merchant bids ─► Seller accepts
                                                                                       │      (LISTED)         (ACTIVE bid)     ─► trade settled; receipt
                                                                                       │                                         (or split part) moves to buyer
                                                                                       ├─► Apply For Loan (PLEDGED) ─► Repay ─► ACTIVE
                                                                                       └─► Owner releases stock (RELEASED; invoices must be paid)
```

## Run it

1. PostgreSQL 14+:
   ```bash
   createuser krsi --pwprompt            # password: local_dev_only (or set DB_PASSWORD)
   createdb krsi -O krsi
   ```
2. Start:
   ```bash
   mvn spring-boot:run
   ```
   On the first start the schema is created, the ledger genesis block is written, and **demo data** is seeded through
   the real services (6 warehouses from the mock-ups, prices, bookings in every state, receipts, a partial sale,
   an open bid, a paid invoice and a loan). Turn this off with `DEMO_SEED=false`.
3. Open Swagger UI: http://127.0.0.1:8080/swagger-ui.html → `POST /api/auth/login` → **Authorize** with the `accessToken`.

Demo users (password `Krsi@1234`):

| Phone | Name | Role |
|---|---|---|
| 9000000001 | Suraj Kumar | Farmer |
| 9000000002 | Anand Traders | Merchant (trader) |
| 9000000003 | Ramesh Nayak | Warehouse owner (owns all 6 warehouses) |
| 9000000004 | Priya Sharma | Auditor |
| 9000000005 | Bundelkhand Farmers FPO | Farmer (FPO) |
| 9000000006 | Shree Foods | Merchant (food processing unit) |

## Configuration (environment variables)

| Variable | Default | Notes |
|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | `jdbc:postgresql://127.0.0.1:5432/krsi`, `krsi`, `local_dev_only` | |
| `JWT_SECRET` | dev value | **Set in any shared environment**; at least 32 characters |
| `JWT_TTL` | `12h` | Access token lifetime |
| `OTP_EXPOSE_IN_RESPONSE` | `true` | Returns the OTP as `devOtp` so the UI works without SMS. **Set `false`** once an SMS gateway is wired (implement `OtpSender`, mark it `@Primary`) |
| `ALLOW_AUDITOR_SIGNUP` | `false` | Auditors are seeded/created by the platform team |
| `CURRENCY` | `INR` | Returned with every amount |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | The Vite dev server is 5173 |
| `DEMO_SEED` | `true` | Seed demo data into an empty database |
| `SWAGGER_ENABLED` | `true` | |

Business defaults (receipt validity 180 days, 30-day storage periods, invoices due in 15 days, loans up to 70% of the
receipt's market value at 9%) are under `app.business` in `application.yml`.

## Project layout

```
src/main/java/com/accenture/krsi
├── config/        AppProperties, SecurityConfig (JWT + CORS), OpenApiConfig, TraceIdFilter
├── controller/    Auth, Dashboard, Warehouse, Booking, Enwr, Trade, Finance, Market, Ledger, System
├── service/       business rules + ledger writes; DemoDataSeeder
├── repository/    JdbcTemplate SQL (Rows/SqlFilter helpers)
├── ledger/        BlockchainLedger, HashChainLedger, BlockHasher, CanonicalJson
├── security/      CurrentUser, TokenService, JSON 401/403 handlers
├── dto/           request/response records, ApiResponse envelope, PageResponse
├── model/         enums (Role, statuses) and User
└── exception/     ApiException, ErrorCode, ApiExceptionHandler
```

## Not included (stubs to replace for production)

- **SMS**: `LoggingOtpSender` only logs. Add an `OtpSender` bean for MSG91/Twilio/SNS.
- **Payments**: `POST /invoices/{id}/pay` records a payment reference; put a payment gateway (and trade escrow) in front of it.
- **Lender**: `LoanService` sanctions instantly as a demo lender; swap in a bank/NBFC API.
- **Weather** on the dashboard is not served by this backend; call a weather API from the UI.
- **Prices** are seeded; feed `commodity_prices` from a market data source (e.g. Agmarknet) on a schedule.

UI developers: see [docs/UI_INTEGRATION_GUIDE.md](docs/UI_INTEGRATION_GUIDE.md).
