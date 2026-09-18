import { describe, it, expect } from "vitest";
import { isQualifiedExpense } from "@/lib/qualified-expense";
// Testing file for 4 different category transactions
// Real world application be more product based but for simulation purposes, we include 4 hard coded tested categories
describe("isQualifiedExpense", () => {
  it("approves Pharmacy as a qualified medical expense", () => {
    expect(isQualifiedExpense("Pharmacy")).toBe(true);
  });

  it("approves Hospital as a qualified medical expense", () => {
    expect(isQualifiedExpense("Hospital")).toBe(true);
  });

  it("denies Restaurant as a non-qualified expense", () => {
    expect(isQualifiedExpense("Restaurant")).toBe(false);
  });

  it("denies Electronics as a non-qualified expense", () => {
    expect(isQualifiedExpense("Electronics")).toBe(false);
  });
});
