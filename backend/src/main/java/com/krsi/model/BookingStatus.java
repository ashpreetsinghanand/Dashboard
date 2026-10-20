package com.krsi.model;

/** Storage booking lifecycle. DEPOSITED means the produce arrived and an eNWR was issued. */
public enum BookingStatus { PENDING, ACCEPTED, REJECTED, CANCELLED, DEPOSITED }
