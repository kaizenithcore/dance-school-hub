import { z } from "zod";

export const brandingFontFamilySchema = z.enum(["inter", "poppins", "montserrat", "lato"]);
export const brandingStyleVariantSchema = z.enum(["clean", "rounded", "bold"]);

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{6})$/, "Color must be a valid hex value like #7C3AED")
  .transform((value) => value.toUpperCase());

export const updateBrandingSchema = z
  .object({
    primary_color: hexColorSchema.optional(),
    secondary_color: hexColorSchema.optional(),
    accent_color: hexColorSchema.optional().nullable(),
    font_family: brandingFontFamilySchema.optional(),
    style_variant: brandingStyleVariantSchema.optional(),
    logo_url: z.string().trim().url().optional().nullable(),
    remove_logo: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one branding field is required",
  });

export type BrandingFontFamily = z.infer<typeof brandingFontFamilySchema>;
export type BrandingStyleVariant = z.infer<typeof brandingStyleVariantSchema>;
export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
