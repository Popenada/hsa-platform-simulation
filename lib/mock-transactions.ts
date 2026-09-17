export type MerchantCategory =
  | "Pharmacy"
  | "Hospital"
  | "Restaurant"
  | "Electronics";

export type Transaction = {
  id: string;
  accountId: string;
  merchantCategory: MerchantCategory;
  amount: number;
};
