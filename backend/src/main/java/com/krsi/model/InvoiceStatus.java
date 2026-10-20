package com.krsi.model;

/** OVERDUE is derived (a PENDING invoice past its due date), not stored. */
public enum InvoiceStatus { PENDING, OVERDUE, PAID, CANCELLED }
