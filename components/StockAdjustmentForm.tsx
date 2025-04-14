"use client";

import { adjustStockAction, AdjustmentActionResult } from "@/actions/inventory";
import type { SelectOption } from "@/types";
import SubmitButton from "./SubmitButton";
import { useEffect, useRef, useActionState } from "react";

interface StockAdjustmentFormProps {
  products: SelectOption[];
  warehouses: SelectOption[];
}

export default function StockAdjustmentForm({ products, warehouses }: StockAdjustmentFormProps) {
  const initialState: AdjustmentActionResult = { success: false, message: '', errorDetails: null };
  const [state, formAction] = useActionState(adjustStockAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
      if (state.success) {
          // Optionally clear the form on success
          formRef.current?.reset();
          // Optionally show a success toast/notification here
          console.log("Success:", state.message);
      }
      if (!state.success && state.message && !state.errorDetails) {
          // General DB error
          console.error("Error:", state.message);
      }
       if (!state.success && typeof state.errorDetails === 'object' && state.errorDetails !== null) {
          // Zod validation errors
           console.error("Validation Errors:", state.errorDetails);
      }
  }, [state]);


  // Helper to get Zod error for a specific field
  const getFieldError = (fieldName: string): string | undefined => {
    if (typeof state.errorDetails === 'object' && state.errorDetails && state.errorDetails[fieldName]) {
        return state.errorDetails[fieldName].join(', ');
    }
    return undefined;
  };

  return (
    <form ref={formRef} action={formAction} className="space-y-4 p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto">
      {/* General Message Area */}
       {state.message && (
        <div className={`p-3 rounded text-sm ${state.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {state.message}
           {/* Display general DB error if no field-specific errors */}
           {!state.success && typeof state.errorDetails === 'string' && (
                <p className="mt-1 text-xs">{state.errorDetails}</p>
            )}
        </div>
      )}

      {/* Product Selection */}
      <div>
        <label htmlFor="productId" className="block text-sm font-medium text-gray-700">Product</label>
        <select
          id="productId"
          name="productId"
          required
          className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border ${getFieldError('productId') ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
          aria-describedby="productId-error"
        >
          <option value="">Select a Product</option>
          {products.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {getFieldError('productId') && <p id="productId-error" className="mt-1 text-xs text-red-600">{getFieldError('productId')}</p>}
      </div>

      {/* Warehouse Selection */}
      <div>
        <label htmlFor="warehouseId" className="block text-sm font-medium text-gray-700">Warehouse</label>
        <select
          id="warehouseId"
          name="warehouseId"
          required
          className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border ${getFieldError('warehouseId') ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
           aria-describedby="warehouseId-error"
       >
          <option value="">Select a Warehouse</option>
          {warehouses.map(w => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
         {getFieldError('warehouseId') && <p id="warehouseId-error" className="mt-1 text-xs text-red-600">{getFieldError('warehouseId')}</p>}
      </div>

      {/* Quantity Change */}
      <div>
        <label htmlFor="quantityChange" className="block text-sm font-medium text-gray-700">
          Quantity Change (+/-)
        </label>
        <input
          type="number"
          id="quantityChange"
          name="quantityChange"
          required
          step="any" // Allow decimals
          className={`mt-1 block w-full shadow-sm sm:text-sm border ${getFieldError('quantityChange') ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500`}
          placeholder="e.g., -5 or 10.5"
          aria-describedby="quantityChange-error"
        />
         {getFieldError('quantityChange') && <p id="quantityChange-error" className="mt-1 text-xs text-red-600">{getFieldError('quantityChange')}</p>}
      </div>

       {/* Adjustment Type */}
      <div>
        <label htmlFor="adjustmentType" className="block text-sm font-medium text-gray-700">Reason for Adjustment</label>
        <select
          id="adjustmentType"
          name="adjustmentType"
          required
          className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border ${getFieldError('adjustmentType') ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
          aria-describedby="adjustmentType-error"
        >
          <option value="">Select a Reason</option>
          <option value="Damage">Damage</option>
          <option value="Shrinkage">Shrinkage/Theft</option>
          <option value="Correction">Count Correction</option>
          <option value="Expiry">Expiry</option>
          <option value="Return">Customer Return</option>
          {/* <option value="Initial Stock">Initial Stock</option> */}
          <option value="Other">Other (Use Notes)</option>
        </select>
         {getFieldError('adjustmentType') && <p id="adjustmentType-error" className="mt-1 text-xs text-red-600">{getFieldError('adjustmentType')}</p>}
      </div>

       {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
        ></textarea>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <SubmitButton pendingText="Adjusting...">Adjust Stock</SubmitButton>
      </div>
    </form>
  );
}