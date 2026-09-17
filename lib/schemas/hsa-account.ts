import { z } from "zod";

export const createHsaAccountSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(100, "Full name must be 100 characters or fewer"),
  dateOfBirth: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), "Enter a valid date")
    .refine(
      (val) => new Date(val) < new Date(),
      "Date of birth must be in the past"
    ),
});

export type CreateHsaAccountInput = z.infer<typeof createHsaAccountSchema>;
