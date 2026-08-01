import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1),
  nameTamil: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  nameTamil: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const createMenuItemSchema = z.object({
  name: z.string().min(1),
  nameTamil: z.string().optional(),
  price: z.number().positive(),
  categoryId: z.string(),
  isVeg: z.boolean(),
  spiceLevel: z.number().int().min(1).max(5),
  prepTimeMinutes: z.number().int().positive(),
  variants: z.array(z.object({
    name: z.string(),
    price: z.number().positive(),
  })).optional(),
  addonGroups: z.array(z.object({
    name: z.string(),
    addons: z.array(z.object({
      name: z.string(),
      price: z.number().nonnegative(),
    })),
  })).optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const toggleAvailabilitySchema = z.object({
  menuItemId: z.string(),
  available: z.boolean(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type ToggleAvailabilityInput = z.infer<typeof toggleAvailabilitySchema>;
