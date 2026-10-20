package com.krsi.service;

import com.krsi.config.AppProperties;
import com.krsi.dto.request.BookingRequests;
import com.krsi.dto.request.EnwrRequests;
import com.krsi.dto.request.FinanceRequests;
import com.krsi.dto.request.TradeRequests;
import com.krsi.dto.request.WarehouseRequests;
import com.krsi.dto.response.BookingResponse;
import com.krsi.dto.response.DepositResult;
import com.krsi.dto.response.TradeResponses;
import com.krsi.model.AuditResult;
import com.krsi.model.InspectionDecision;
import com.krsi.model.UserCategory;
import com.krsi.repository.MarketRepository;
import com.krsi.repository.UserRepository;
import com.krsi.security.AuthUser;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Fills an empty database with the warehouses, prices and people from the UI mock-ups, then runs a real
 * storage-to-trade flow through the services (so every record has matching ledger blocks):
 * bookings -> deposits -> quality inspection -> listing -> bids -> partial sale -> invoice payment -> loan.
 * Turn off with DEMO_SEED=false.
 */
@Component
public class DemoDataSeeder {
    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private static final List<WarehouseRequests.Attribute> INFRASTRUCTURE = List.of(
            attr("Structure", "1"), attr("Age of Warehouse", "0-5 Years"), attr("Floor Type", "RCC"), attr("Type of Door", "Iron Shutter"),
            attr("Compound Gate", "Yes"), attr("Roof", "Tin"), attr("Wall Type", "Tin"), attr("Floor Size (ft)", "131'44\" X 16'"),
            attr("Plinth Height", "8 ft"), attr("Number of Doors", "2"), attr("Number of Windows", "13"),
            attr("Ventilation Type", "Normal"), attr("Fire Safety", "Yes (NOC)"), attr("Security", "CCTV, Guard Room"));
    private static final List<String> AMENITIES = List.of("Pakka Road", "Separate Guard Room", "Fire Extinguishers", "Phone",
            "Rodent Control", "Safety Signage", "Running Water", "Open Plinth", "Electricity", "Fire/Smoke Detector", "Sprinkler System",
            "Grading Machine", "Iron Sheet", "Drain Pipes", "Drinking Water", "Fire Bucket", "Hoses & Hydrant", "Lock & Key");
    private static final List<String> LICENSES = List.of("Verified Warehouse", "WDRA Registered", "FSSAI Compliant", "Quality Assured");
    private static final String DESCRIPTION = "Modern warehouse facility with high capacity, suitable for grains, pulses and other "
            + "agricultural commodities. Well connected by road and ideal for long term storage.";

    private final AppProperties properties;
    private final UserRepository users;
    private final MarketRepository market;
    private final AuthService auth;
    private final WarehouseService warehouses;
    private final AuditService audits;
    private final BookingService bookings;
    private final EnwrService enwrs;
    private final TradeService trade;
    private final InvoiceService invoices;
    private final LoanService loans;

    public DemoDataSeeder(AppProperties properties, UserRepository users, MarketRepository market, AuthService auth,
                          WarehouseService warehouses, AuditService audits, BookingService bookings, EnwrService enwrs,
                          TradeService trade, InvoiceService invoices, LoanService loans) {
        this.properties = properties;
        this.users = users;
        this.market = market;
        this.auth = auth;
        this.warehouses = warehouses;
        this.audits = audits;
        this.bookings = bookings;
        this.enwrs = enwrs;
        this.trade = trade;
        this.invoices = invoices;
        this.loans = loans;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Order(Ordered.LOWEST_PRECEDENCE)
    public void seed() {
        seedCommodities();
        if (!properties.demo().seed() || users.count() > 0) return;
        try {
            seedDemo();
            log.info("Demo data created. Sign in with 9000000001 (farmer), 9000000002 (merchant), 9000000003 (warehouse owner), "
                    + "9000000004 (auditor); password from app.demo.password");
        } catch (RuntimeException e) {
            log.error("Demo data seeding failed; the app is still usable", e);
        }
    }

    /** Commodities and prices are reference data: always upserted (idempotent). */
    private void seedCommodities() {
        Object[][] rows = {
                {"Coffee", "Coffee & Tea", "/assets/coffee.png", "Cherry", "250.00", "244.10", "Chikmagalur"},
                {"Turmeric", "Spices", "/assets/turmeric.png", "Raw", "145.00", "142.40", "Erode"},
                {"Cumin", "Spices", "/assets/cumin.jpg", "Raw", "260.00", "263.50", "Unjha"},
                {"Cardamom", "Spices", "/assets/cardamom.jpg", "Bold", "2400.00", "2397.60", "Bodinayakanur"},
                {"Black Pepper", "Spices", "/assets/pepper.jpg", "Raw", "640.00", "624.40", "Kochi"},
                {"Clove", "Spices", "/assets/clove.png", "Raw", "950.00", "945.30", "Kanyakumari"},
                {"Arecanut", "Spices", "/assets/arecanut.jpg", "Chali", "480.00", "486.00", "Shivamogga"},
                {"Wheat", "Grain", "/assets/cumin.jpg", "FAQ", "25.50", "25.10", "Indore"},
                {"Rice", "Grain", "/assets/cumin.jpg", "Common", "38.00", "38.40", "Karnal"},
                {"Maize", "Grain", "/assets/cumin.jpg", "FAQ", "22.40", "21.90", "Davangere"},
                {"Barley", "Grain", "/assets/cumin.jpg", "FAQ", "24.00", "24.20", "Jaipur"},
                {"Soyabean", "Oilseeds", "/assets/cumin.jpg", "Yellow", "46.00", "45.20", "Latur"},
                {"Mustard", "Oilseeds", "/assets/cumin.jpg", "Black", "58.00", "58.90", "Bharatpur"},
                {"Chana", "Pulses", "/assets/cumin.jpg", "Desi", "62.00", "61.10", "Bikaner"}};
        for (Object[] r : rows) {
            market.upsertCommodity((String) r[0], (String) r[1], (String) r[2]);
            if (market.pricePerMt((String) r[0]).isEmpty())
                market.upsertPrice((String) r[0], (String) r[3], new BigDecimal((String) r[4]), new BigDecimal((String) r[5]), (String) r[6]);
        }
    }

    private void seedDemo() {
        String pw = properties.demo().password();
        AuthUser farmer = user("9000000001", "Suraj Kumar", UserCategory.FARMER, "Dichaon Kalan", "Delhi", 28.61, 76.95, pw);
        AuthUser merchant = user("9000000002", "Anand Traders", UserCategory.TRADER, "Jhansi", "Uttar Pradesh", 25.45, 78.57, pw);
        AuthUser owner = user("9000000003", "Ramesh Nayak", UserCategory.WAREHOUSE_OWNER, "Lalitpur", "Uttar Pradesh", 24.69, 78.42, pw);
        AuthUser auditor = user("9000000004", "Priya Sharma", UserCategory.AUDITOR, "Lucknow", "Uttar Pradesh", 26.85, 80.95, pw);
        user("9000000005", "Bundelkhand Farmers FPO", UserCategory.FPO, "Mahoba", "Uttar Pradesh", 25.29, 79.87, pw);
        AuthUser processor = user("9000000006", "Shree Foods", UserCategory.FPU, "Orai", "Uttar Pradesh", 25.99, 79.45, pw);

        warehouse(owner, "nayak", "Nayak Warehouse", "Nayak Stone Industries", "WAH-UP-0823", "Nayak Industries Pvt. Ltd.", "Lalitpur, Uttar Pradesh",
                "Lalitpur, UP", "Uttar Pradesh", 24.69, 78.42, "5000", List.of("Coffee", "Clove", "Arecanut", "Wheat", "Rice", "Turmeric",
                        "Cumin", "Cardamom", "Black Pepper"), "/assets/warehouse-card.png", 2021, 13000);
        warehouse(owner, "shree-agro", "Shree Agro Storage", "Shree Agro Storage LLP", "WAH-UP-1140", "Shree Agro Storage LLP", "Jhansi, Uttar Pradesh",
                "Jhansi, UP", "Uttar Pradesh", 25.45, 78.57, "3000", List.of("Coffee", "Cumin", "Turmeric", "Wheat", "Rice"),
                "/assets/warehouse.png", 2019, 9000);
        warehouse(owner, "bundelkhand", "Bundelkhand Warehouse", "Bundelkhand Warehousing Co.", "WAH-MP-0412", "Bundelkhand Warehousing Co.",
                "Tikamgarh, Madhya Pradesh", "Tikamgarh, MP", "Madhya Pradesh", 24.74, 78.83, "5000",
                List.of("Coffee", "Cumin", "Clove", "Rice", "Maize"), "/assets/farmer-field.png", 2018, 15000);
        warehouse(owner, "krishi", "Krishi Storage Solutions", "Krishi Storage Solutions Pvt. Ltd.", "WAH-UP-0977", "Krishi Storage Solutions Pvt. Ltd.",
                "Mahoba, Uttar Pradesh", "Mahoba, UP", "Uttar Pradesh", 25.29, 79.87, "3500", List.of("Wheat", "Rice", "Maize", "Cumin", "Clove"),
                "/assets/hero.jpg", 2020, 11000);
        warehouse(owner, "agri-vault", "Agri Vault Warehouse", "Agri Vault Pvt. Ltd.", "WAH-UP-1203", "Agri Vault Pvt. Ltd.", "Orai, Uttar Pradesh",
                "Orai, UP", "Uttar Pradesh", 25.99, 79.45, "4000", List.of("Wheat", "Rice", "Maize", "Turmeric", "Coffee"),
                "/assets/warehouse.png", 2022, 12000);
        warehouse(owner, "green-field", "Green Field Warehouse", "Green Field Agro", "WAH-MP-0655", "Green Field Agro", "Chhatarpur, Madhya Pradesh",
                "Chhatarpur, MP", "Madhya Pradesh", 24.92, 79.58, "3000", List.of("Wheat", "Rice", "Maize", "Clove", "Cumin"),
                "/assets/warehouse-card.png", 2017, 9500);

        for (String id : List.of("nayak", "shree-agro", "bundelkhand", "krishi")) {
            audits.auditWarehouse(auditor, id, new WarehouseRequests.Audit(AuditResult.PASSED, new BigDecimal("4.6"), BigDecimal.ZERO,
                    "Structure, fire safety and pest control in order. No stock on site at time of audit.", LocalDate.now()));
        }

        LocalDate soon = LocalDate.now().plusDays(3);
        // Coffee: deposited, inspected, listed, partly sold to the merchant, with another open bid.
        long coffeeEnwr = depositAndApprove(farmer, owner, auditor, "Coffee", "Grade A", "500", soon, "Grade A");
        TradeResponses.Listing coffeeListing = trade.createListing(farmer, new TradeRequests.CreateListing(coffeeEnwr,
                new BigDecimal("260000"), new BigDecimal("10"), 30));
        TradeResponses.Bid firstBid = trade.placeBid(merchant, coffeeListing.id(), new TradeRequests.PlaceBid(new BigDecimal("10"), new BigDecimal("255000")));
        trade.acceptBid(farmer, firstBid.id());
        trade.placeBid(processor, coffeeListing.id(), new TradeRequests.PlaceBid(new BigDecimal("15"), new BigDecimal("252000")));

        // Turmeric: deposited, inspected, storage invoice paid, loan taken against it.
        long turmericEnwr = depositAndApprove(farmer, owner, auditor, "Turmeric", "Raw", "500", soon, "Raw");
        invoices.search(farmer, new FinanceRequests.InvoiceSearch(null, null, "Turmeric", 0, 1)).items()
                .forEach(i -> invoices.pay(farmer, i.id(), "UPI-DEMO-0001"));
        loans.apply(farmer, new FinanceRequests.ApplyLoan(turmericEnwr, new BigDecimal("1000000")));

        // Cumin: deposited and waiting for the auditor (shows up on the auditor dashboard).
        BookingResponse cumin = bookings.create(farmer, new BookingRequests.Create("nayak", "Cumin", "Raw", new BigDecimal("500"), soon));
        bookings.accept(owner, cumin.id(), "Bring produce between 9 am and 5 pm");
        bookings.deposit(owner, cumin.id(), new BookingRequests.Deposit(null, null, null, new BigDecimal("9.5")));

        // Bookings in other states, matching the Booking Request mock-up.
        BookingResponse pepper = bookings.create(farmer, new BookingRequests.Create("nayak", "Black Pepper", "Raw", new BigDecimal("500"), soon));
        bookings.accept(owner, pepper.id(), "Slot confirmed");
        BookingResponse cardamom = bookings.create(farmer, new BookingRequests.Create("nayak", "Cardamom", "Raw", new BigDecimal("500"), soon));
        bookings.reject(owner, cardamom.id(), "Cardamom chamber under maintenance this month");
        bookings.create(farmer, new BookingRequests.Create("shree-agro", "Coffee", "Grade A", new BigDecimal("500"), soon));
        bookings.create(merchant, new BookingRequests.Create("bundelkhand", "Maize", "FAQ", new BigDecimal("800"), soon));

        market.watch(farmer.id(), "Coffee");
        market.watch(farmer.id(), "Cardamom");
    }

    private long depositAndApprove(AuthUser farmer, AuthUser owner, AuthUser auditor, String commodity, String grade, String qtl,
                                   LocalDate date, String finalGrade) {
        BookingResponse b = bookings.create(farmer, new BookingRequests.Create("nayak", commodity, grade, new BigDecimal(qtl), date));
        bookings.accept(owner, b.id(), "Slot confirmed");
        DepositResult d = bookings.deposit(owner, b.id(), new BookingRequests.Deposit(null, null, null, new BigDecimal("11.0")));
        enwrs.inspect(auditor, d.receipt().id(), new EnwrRequests.Inspection(InspectionDecision.APPROVE, finalGrade,
                new BigDecimal("11.0"), new BigDecimal("0.5"), "Sampled 5 bags; meets grade"));
        return d.receipt().id();
    }

    private AuthUser user(String phone, String name, UserCategory category, String district, String state, double lat, double lng, String pw) {
        return AuthService.asAuthUser(auth.register(phone, name, category, "English", pw, district, state, lat, lng));
    }

    private void warehouse(AuthUser owner, String slug, String name, String legalName, String code, String operator, String address, String district,
                           String state, double lat, double lng, String capacity, List<String> crops, String photo, int year, int area) {
        warehouses.create(owner, new WarehouseRequests.Upsert(slug, name, legalName, code, operator, "Private", DESCRIPTION, address, district,
                state, lat, lng, new BigDecimal(capacity), new BigDecimal("120"), crops, AMENITIES, LICENSES,
                List.of(photo, "/assets/warehouse.png", "/assets/farmer-field.png", "/assets/hero.jpg"),
                "Grains, Pulses, Oilseeds, Spices", "24/7", "NH-44 (12 Km), Rail (28 Km)", year, area, true, INFRASTRUCTURE));
    }

    private static WarehouseRequests.Attribute attr(String label, String value) { return new WarehouseRequests.Attribute(label, value); }
}
