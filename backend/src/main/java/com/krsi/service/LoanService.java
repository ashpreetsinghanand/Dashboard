package com.krsi.service;

import com.krsi.config.AppProperties;
import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.FinanceRequests;
import com.krsi.dto.response.FinanceResponses.Loan;
import com.krsi.dto.response.FinanceResponses.LoanEligibility;
import com.krsi.exception.ApiException;
import com.krsi.ledger.BlockchainLedger;
import com.krsi.ledger.LedgerEvent;
import com.krsi.ledger.LedgerEventType;
import com.krsi.ledger.Payload;
import com.krsi.model.EnwrStatus;
import com.krsi.model.LoanStatus;
import com.krsi.model.Role;
import com.krsi.repository.EnwrRepository;
import com.krsi.repository.FinanceRepository;
import com.krsi.repository.FinanceRepository.LoanCore;
import com.krsi.repository.MarketRepository;
import com.krsi.security.AuthUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Warehouse-receipt financing with a built-in demo lender: up to app.business.loan-to-value of the receipt's market
 * value is sanctioned instantly and the receipt is PLEDGED until the loan is repaid. Interest is shown, not accrued.
 * Replace this service's sanction step with a bank/NBFC API for production.
 */
@Service
public class LoanService {
    private final FinanceRepository finance;
    private final EnwrRepository enwrs;
    private final MarketRepository market;
    private final BlockchainLedger ledger;
    private final AppProperties.Business business;

    public LoanService(FinanceRepository finance, EnwrRepository enwrs, MarketRepository market, BlockchainLedger ledger,
                       AppProperties properties) {
        this.finance = finance;
        this.enwrs = enwrs;
        this.market = market;
        this.ledger = ledger;
        this.business = properties.business();
    }

    public LoanEligibility eligibility(AuthUser me, long enwrId) {
        EnwrRepository.Core e = enwrs.core(enwrId).orElseThrow(() -> ApiException.notFound("Receipt", enwrId));
        if (e.ownerId() != me.id()) throw ApiException.notFound("Receipt", enwrId);
        return eligibility(e);
    }

    private LoanEligibility eligibility(EnwrRepository.Core e) {
        BigDecimal price = market.pricePerMt(e.commodity()).orElse(BigDecimal.ZERO);
        BigDecimal value = price.multiply(e.quantityMt()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal max = value.multiply(business.loanToValue()).setScale(0, RoundingMode.DOWN);
        String reason = null;
        if (e.status() != EnwrStatus.ACTIVE) reason = "Only ACTIVE receipts can be pledged (status is " + e.status() + ")";
        else if (e.validTill().isBefore(LocalDate.now().plusDays(30))) reason = "Receipt expires within 30 days";
        else if (max.signum() <= 0) reason = "No market price available for " + e.commodity();
        return new LoanEligibility(e.id(), e.receiptNo(), reason == null, reason, value, business.loanToValue(), max,
                business.loanInterestRatePct(), business.currency());
    }

    @Transactional
    public Loan apply(AuthUser me, FinanceRequests.ApplyLoan r) {
        EnwrRepository.Core e = enwrs.coreForUpdate(r.enwrId()).orElseThrow(() -> ApiException.notFound("Receipt", r.enwrId()));
        if (e.ownerId() != me.id()) throw ApiException.forbidden("You can only borrow against receipts you hold");
        LoanEligibility check = eligibility(e);
        if (!check.eligible()) throw ApiException.state(check.reason());
        if (r.amount().compareTo(check.maxAmount()) > 0)
            throw ApiException.invalid("Maximum loan against this receipt is " + check.maxAmount().toPlainString() + " " + business.currency());
        enwrs.transition(e.id(), List.of(EnwrStatus.ACTIVE), EnwrStatus.PLEDGED);
        long id = finance.insertLoan(e.id(), me.id(), r.amount(), business.loanInterestRatePct());
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.LOAN_SANCTIONED, "LOAN", id, me, Payload.of(
                "loanId", id, "enwrId", e.id(), "receiptNo", e.receiptNo(), "principal", r.amount(), "currency", business.currency(),
                "interestRatePct", business.loanInterestRatePct(), "marketValue", check.marketValue()))).hash();
        finance.setLoanLedgerHash(id, hash);
        enwrs.setLedgerHash(e.id(), hash);
        return get(me, id);
    }

    @Transactional
    public Loan repay(AuthUser me, long id, BigDecimal amount) {
        LoanCore loan = finance.loanForUpdate(id).orElseThrow(() -> ApiException.notFound("Loan", id));
        if (loan.borrowerId() != me.id()) throw ApiException.notFound("Loan", id);
        if (loan.status() != LoanStatus.ACTIVE) throw ApiException.state("This loan is already closed");
        if (amount.compareTo(loan.outstanding()) > 0)
            throw ApiException.invalid("Amount exceeds the outstanding " + loan.outstanding().toPlainString() + " " + business.currency());
        boolean close = amount.compareTo(loan.outstanding()) == 0;
        finance.repay(id, amount, close);
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.LOAN_REPAYMENT, "LOAN", id, me, Payload.of(
                "loanId", id, "amount", amount, "outstandingAfter", loan.outstanding().subtract(amount)))).hash();
        if (close) {
            enwrs.transition(loan.enwrId(), List.of(EnwrStatus.PLEDGED), EnwrStatus.ACTIVE);
            hash = ledger.record(LedgerEvent.of(LedgerEventType.LOAN_CLOSED, "LOAN", id, me,
                    Payload.of("loanId", id, "enwrId", loan.enwrId(), "pledgeReleased", true))).hash();
            enwrs.setLedgerHash(loan.enwrId(), hash);
        }
        finance.setLoanLedgerHash(id, hash);
        return get(me, id);
    }

    public PageResponse<Loan> mine(AuthUser me, FinanceRequests.LoanSearch s) { return finance.loans(me.id(), s, business.currency()); }

    public Loan get(AuthUser me, long id) {
        Loan loan = finance.loan(id, business.currency()).orElseThrow(() -> ApiException.notFound("Loan", id));
        if (loan.borrowerId() != me.id() && me.role() != Role.AUDITOR) throw ApiException.notFound("Loan", id);
        return loan;
    }
}
