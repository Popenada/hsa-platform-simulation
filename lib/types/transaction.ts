export type MerchantCategory =
  | "Pharmacy"
  | "Hospital"
  | "Restaurant"
  | "Electronics";

export type TransactionStatus = "approved" | "declined";

export type Transaction = {
  id: string;
  accountId: string;
  cardId: string | null;
  merchantCategory: MerchantCategory;
  amount: number;
  status: TransactionStatus;
  reason: string | null;
};
