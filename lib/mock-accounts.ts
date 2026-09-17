export type HsaAccount = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  balance: number;
  createdAt: string;
};

export const mockAccounts: HsaAccount[] = [
  {
    id: "acc_1",
    fullName: "Jane Doe",
    dateOfBirth: "1990-04-12",
    balance: 1250.5,
    createdAt: "2026-01-15",
  },
  {
    id: "acc_2",
    fullName: "Jane Doe",
    dateOfBirth: "1990-04-12",
    balance: 430.0,
    createdAt: "2026-03-02",
  },
];
