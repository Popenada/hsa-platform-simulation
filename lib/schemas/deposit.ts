import { z } from "zod";

export const depositSchema = z.object({
  amount: z.coerce.number().positive("Deposit amount must be greater than 0"),
});

export type DepositInput = z.infer<typeof depositSchema>;
