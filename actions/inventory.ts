// actions/inventory.ts
"use server"; // Mark this file as containing Server Actions

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod'; // npm install zod

// Define schema for validation
const AdjustmentSchema = z.object({
  productId: z.coerce.number().int().positive('Product must be selected.'),
  warehouseId: z.coerce.number().int().positive('Warehouse must be selected.'),
  quantityChange: z.coerce.number().refine(val => val !== 0, {
    message: 'Quantity change cannot be zero.',
  }),
  adjustmentType: z.string().min(1, 'Adjustment type is required.'),
  notes: z.string().optional(),
});

const ReceiveSchema = z.object({
  poItemId: z.coerce.number().int().positive('Purchase Order Item must be selected.'),
  warehouseId: z.coerce.number().int().positive('Warehouse must be selected.'),
  quantityReceived: z.coerce.number().positive('Quantity received must be positive.'),
  notes: z.string().optional(),
});

// --- Stock Adjustment Action ---
export interface AdjustmentActionResult {
  success: boolean;
  message: string;
  errorDetails?: Record<string, string[]> | string | null; // For Zod errors or general DB errors
}

export async function adjustStockAction(
  prevState: AdjustmentActionResult | null, // Required for useFormState
  formData: FormData
): Promise<AdjustmentActionResult> {

  // 1. Validate form data
  const validatedFields = AdjustmentSchema.safeParse({
    productId: formData.get('productId'),
    warehouseId: formData.get('warehouseId'),
    quantityChange: formData.get('quantityChange'),
    adjustmentType: formData.get('adjustmentType'),
    notes: formData.get('notes'),
  });

  if (!validatedFields.success) {
    console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
    return {
      success: false,
      message: "Validation failed. Please check the fields.",
      errorDetails: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { productId, warehouseId, quantityChange, adjustmentType, notes } = validatedFields.data;
  const userId = 1; // Hardcoded for now, replace with actual logged-in user ID

  try {
    // 2. Call the stored procedure
    // Note: Stored procedures don't return rows directly via query().
    // We rely on it raising an exception on failure.
    await query(
      'CALL sp_adjust_stock($1, $2, $3, $4, $5, $6);',
      [productId, warehouseId, quantityChange, adjustmentType, userId, notes]
    );

    // 3. Revalidate paths to update displayed data
    revalidatePath('/inventory');
    revalidatePath('/movements');
    if (quantityChange < 0) {
        revalidatePath('/low-stock'); // Might affect low stock
    }

    // 4. Return success
    return { success: true, message: `Stock adjusted successfully by ${quantityChange}.` };

  } catch (error: any) {
    console.error("Database Error Adjusting Stock:", error);
    // Attempt to extract the user-friendly error message from PostgreSQL RAISE EXCEPTION
    const dbErrorMessage = error.message?.includes('CONTEXT:')
                           ? error.message.split('\n')[0]?.replace('ERROR:  ', '')
                           : 'Database error occurred.';

    return {
        success: false,
        message: `Failed to adjust stock: ${dbErrorMessage}`,
        errorDetails: dbErrorMessage // Provide general DB error back
    };
  }
}


// --- PO Receiving Action ---
export interface ReceiveActionResult {
  success: boolean;
  message: string;
  errorDetails?: Record<string, string[]> | string | null;
}

export async function receivePOItemAction(
  prevState: ReceiveActionResult | null,
  formData: FormData
): Promise<ReceiveActionResult> {

  // 1. Validate
   const validatedFields = ReceiveSchema.safeParse({
    poItemId: formData.get('poItemId'),
    warehouseId: formData.get('warehouseId'),
    quantityReceived: formData.get('quantityReceived'),
    notes: formData.get('notes'),
  });

   if (!validatedFields.success) {
    console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
    return {
      success: false,
      message: "Validation failed. Please check the fields.",
      errorDetails: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { poItemId, warehouseId, quantityReceived, notes } = validatedFields.data;
  const userId = 2; // Hardcoded for now

   try {
    // 2. Call stored procedure
    await query(
      'CALL sp_receive_purchase_order_item($1, $2, $3, $4, $5);',
      [poItemId, warehouseId, quantityReceived, userId, notes]
    );

    // 3. Revalidate paths
    revalidatePath('/inventory');
    revalidatePath('/movements');
    revalidatePath('/low-stock'); // Receiving might resolve low stock
    revalidatePath('/receive'); // Update the list of pending items

    // 4. Return success
    return { success: true, message: `Successfully received ${quantityReceived} units for PO Item ${poItemId}.` };

  } catch (error: any) {
    console.error("Database Error Receiving PO Item:", error);
    const dbErrorMessage = error.message?.includes('CONTEXT:')
                           ? error.message.split('\n')[0]?.replace('ERROR:  ', '')
                           : 'Database error occurred.';

    return {
        success: false,
        message: `Failed to receive PO item: ${dbErrorMessage}`,
        errorDetails: dbErrorMessage
    };
  }
}