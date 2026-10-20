package com.krsi.model;

/** Warehouse receipt lifecycle. Only ACTIVE receipts can be listed, pledged or released. */
public enum EnwrStatus { PENDING_AUDIT, ACTIVE, LISTED, PLEDGED, SOLD, RELEASED, REJECTED }
