import { MerchantCategory } from "@/lib/types/transaction";

const QUALIFIED_CATEGORIES: MerchantCategory[] = ["Pharmacy", "Hospital"];

export function isQualifiedExpense(category: MerchantCategory): boolean {
  return QUALIFIED_CATEGORIES.includes(category);
}
