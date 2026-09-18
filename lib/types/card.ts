export type HsaCard = {
  id: string;
  accountId: string;
  cardNumber: string;
  status: "active" | "inactive";
  issuedAt: string;
};
