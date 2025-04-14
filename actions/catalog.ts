'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- Create Category ---

const CategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters.'),
  description: z.string().optional(),
});

export interface CreateCategoryResult {
  success: boolean;
  message: string;
  errorDetails?: Record<string, string[]> | string | null;
  newCategoryId?: number; // Optionally return the ID
}

export async function createCategoryAction(
  prevState: CreateCategoryResult | null,
  formData: FormData,
): Promise<CreateCategoryResult> {
  const validatedFields = CategorySchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || null, // Ensure null if empty
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed.',
      errorDetails: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, description } = validatedFields.data;

  try {
    const result = await query<{ category_id: number }>(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING category_id;',
      [name, description],
    );

    // Revalidate paths where categories might be displayed or used in dropdowns
    revalidatePath('/catalog/categories/new'); // Revalidate self if needed
    revalidatePath('/catalog/products/new'); // Product form uses category dropdown
    // Add other paths if categories are listed elsewhere

    return {
      success: true,
      message: `Category "${name}" created successfully.`,
      newCategoryId: result[0]?.category_id,
    };
  } catch (error: any) {
    console.error('Database Error Creating Category:', error);
    let errorMessage = 'Database error occurred.';
    // Check for PostgreSQL unique violation error code '23505'
    if (error.code === '23505' && error.constraint === 'categories_name_key') {
      errorMessage = `Category name "${name}" already exists.`;
      return {
        // Return structured error for specific field
        success: false,
        message: 'Failed to create category.',
        errorDetails: { name: [errorMessage] },
      };
    }

    return {
      success: false,
      message: `Failed to create category: ${errorMessage}`,
      errorDetails: errorMessage,
    };
  }
}

// --- Create Product ---

const ProductSchema = z.object({
  sku: z.string().min(3, 'SKU must be at least 3 characters.'),
  name: z.string().min(2, 'Product name must be at least 2 characters.'),
  description: z.string().optional(),
  categoryId: z.coerce
    .number()
    .int()
    .positive('Category must be selected.')
    .nullable(), // Allow null if selection is optional or ""
  supplierId: z.coerce
    .number()
    .int()
    .positive('Supplier must be selected.')
    .nullable(), // Allow null
  unitOfMeasure: z.string().min(1, 'Unit of measure is required.'),
  purchasePrice: z.coerce
    .number()
    .min(0, 'Purchase price cannot be negative.')
    .optional()
    .default(0),
  sellingPrice: z.coerce
    .number()
    .min(0, 'Selling price cannot be negative.')
    .optional()
    .default(0),
  reorderLevel: z.coerce
    .number()
    .min(0, 'Reorder level cannot be negative.')
    .optional()
    .default(0),
  targetStockLevel: z.coerce
    .number()
    .min(0, 'Target stock level cannot be negative.')
    .optional()
    .default(0),
});

export interface CreateProductResult {
  success: boolean;
  message: string;
  errorDetails?: Record<string, string[]> | string | null;
  newProductId?: number;
}

export async function createProductAction(
  prevState: CreateProductResult | null,
  formData: FormData,
): Promise<CreateProductResult> {
  // Handle empty string from select as null for foreign keys
  const parseOptionalForeignKey = (
    value: FormDataEntryValue | null,
  ): number | null => {
    const strValue = typeof value === 'string' ? value.trim() : null;
    if (!strValue) return null;
    const num = parseInt(strValue, 10);
    return isNaN(num) ? null : num;
  };

  const validatedFields = ProductSchema.safeParse({
    sku: formData.get('sku'),
    name: formData.get('name'),
    description: formData.get('description') || null,
    categoryId: parseOptionalForeignKey(formData.get('categoryId')),
    supplierId: parseOptionalForeignKey(formData.get('supplierId')),
    unitOfMeasure: formData.get('unitOfMeasure'),
    purchasePrice: formData.get('purchasePrice'),
    sellingPrice: formData.get('sellingPrice'),
    reorderLevel: formData.get('reorderLevel'),
    targetStockLevel: formData.get('targetStockLevel'),
  });

  if (!validatedFields.success) {
    console.log(validatedFields.error.flatten().fieldErrors);
    return {
      success: false,
      message: 'Validation failed.',
      errorDetails: validatedFields.error.flatten().fieldErrors,
    };
  }

  const {
    sku,
    name,
    description,
    categoryId,
    supplierId,
    unitOfMeasure,
    purchasePrice,
    sellingPrice,
    reorderLevel,
    targetStockLevel,
  } = validatedFields.data;

  try {
    const result = await query<{ product_id: number }>(
      `
            INSERT INTO products
                (sku, name, description, category_id, supplier_id, unit_of_measure, purchase_price, selling_price, reorder_level, target_stock_level, is_active)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
            RETURNING product_id;
        `,
      [
        sku,
        name,
        description,
        categoryId,
        supplierId,
        unitOfMeasure,
        purchasePrice,
        sellingPrice,
        reorderLevel,
        targetStockLevel,
      ],
    );

    // Revalidate paths where products are listed or affect inventory
    revalidatePath('/inventory');
    revalidatePath('/low-stock');
    // Could potentially revalidate the specific product page if we redirect there
    // revalidatePath(`/products/${result[0]?.product_id}`);

    return {
      success: true,
      message: `Product "${name}" (SKU: ${sku}) created successfully.`,
      newProductId: result[0]?.product_id,
    };
  } catch (error: any) {
    console.error('Database Error Creating Product:', error);
    let errorMessage = 'Database error occurred.';
    let fieldErrors: Record<string, string[]> | null = null;

    if (error.code === '23505') {
      // Unique violation
      if (error.constraint === 'products_sku_key') {
        errorMessage = `SKU "${sku}" already exists.`;
        fieldErrors = { sku: [errorMessage] };
      } else {
        errorMessage = 'A unique constraint was violated.';
      }
    } else if (error.code === '23503') {
      // Foreign key violation
      if (error.constraint === 'products_category_id_fkey') {
        errorMessage = 'Invalid Category selected.';
        fieldErrors = { categoryId: [errorMessage] };
      } else if (error.constraint === 'products_supplier_id_fkey') {
        errorMessage = 'Invalid Supplier selected.';
        fieldErrors = { supplierId: [errorMessage] };
      } else {
        errorMessage = 'A related record was not found.';
      }
    }

    return {
      success: false,
      message: `Failed to create product: ${errorMessage}`,
      errorDetails: fieldErrors ?? errorMessage, // Return specific field error or general message
    };
  }
}
