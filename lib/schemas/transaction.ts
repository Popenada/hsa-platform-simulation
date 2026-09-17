import { z } from "zod";

export const merchantCategorySchema = z.enum([
  "Pharmacy",
  "Hospital",
  "Restaurant",
  "Electronics",
]);

export const createTransactionSchema = z.object({
  accountId: z.string().uuid("Invalid account id"),
  merchantCategory: merchantCategorySchema,
  amount: z.coerce.number().positive("Amount must be greater than 0"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
