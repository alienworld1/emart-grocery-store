"use client";

import { receivePOItemAction, ReceiveActionResult } from "@/actions/inventory";
import type { SelectOption, PendingPOItemOption } from "@/types";
import SubmitButton from "./SubmitButton";
import { useState, useEffect, useRef, useActionState } from "react";

interface ReceivePOFormProps {
  pendingItems: PendingPOItemOption[];
  warehouses: SelectOption[];
}

export default function ReceivePOForm({ pendingItems, warehouses }: ReceivePOFormProps) {
    const initialState: ReceiveActionResult = { success: false, message: '', errorDetails: null };
    const [state, formAction] = useActionState(receivePOItemAction, initialState);
    const [selectedItem, setSelectedItem] = useState<PendingPOItemOption | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
      if (state.success) {
          formRef.current?.reset();
          setSelectedItem(null); // Reset selected item display
          console.log("Success:", state.message);
      }
       if (!state.success && state.message && !state.errorDetails) {
          console.error("Error:", state.message);
      }
       if (!state.success && typeof state.errorDetails === 'object' && state.errorDetails !== null) {
           console.error("Validation Errors:", state.errorDetails);
      }
    }, [state]);

    const handleItemChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const poItemId = parseInt(event.target.value, 10);
        const item = pendingItems.find(i => i.value === poItemId) || null;
        setSelectedItem(item);
    };

    const getFieldError = (fieldName: string): string | undefined => {
        if (typeof state.errorDetails === 'object' && state.errorDetails && state.errorDetails[fieldName]) {
            return state.errorDetails[fieldName].join(', ');
        }
        return undefined;
    };

    const maxReceivable = selectedItem
        ? parseFloat(selectedItem.quantityOrdered) - parseFloat(selectedItem.quantityReceived)
        : undefined;

  return (
    <form ref={formRef} action={formAction} className="space-y-4 p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto">
        {/* General Message Area */}
        {state.message && (
            <div className={`p-3 rounded text-sm ${state.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {state.message}
            {!state.success && typeof state.errorDetails === 'string' && (
                <p className="mt-1 text-xs">{state.errorDetails}</p>
            )}
            </div>
        )}

      {/* PO Item Selection */}
      <div>
        <label htmlFor="poItemId" className="block text-sm font-medium text-gray-700">Pending Purchase Order Item</label>
        <select
          id="poItemId"
          name="poItemId"
          required
          onChange={handleItemChange}
          className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border ${getFieldError('poItemId') ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
          aria-describedby="poItemId-error"
        >
          <option value="">Select Item to Receive</option>
          {pendingItems.map(item => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
         {getFieldError('poItemId') && <p id="poItemId-error" className="mt-1 text-xs text-red-600">{getFieldError('poItemId')}</p>}
         {selectedItem && (
             <p className="mt-1 text-xs text-gray-600">
                 Max receivable quantity: {maxReceivable?.toFixed(3) ?? 'N/A'}
            </p>
         )}
      </div>

      {/* Warehouse Selection */}
      <div>
        <label htmlFor="warehouseId" className="block text-sm font-medium text-gray-700">Receiving Warehouse</label>
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

      {/* Quantity Received */}
      <div>
        <label htmlFor="quantityReceived" className="block text-sm font-medium text-gray-700">Quantity Received</label>
        <input
          type="number"
          id="quantityReceived"
          name="quantityReceived"
          required
          step="any"
          min="0.001" // Must receive something positive
          max={maxReceivable?.toFixed(3)} // Set max based on pending amount
          className={`mt-1 block w-full shadow-sm sm:text-sm border ${getFieldError('quantityReceived') ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500`}
          placeholder="e.g., 10 or 5.5"
          aria-describedby="quantityReceived-error"
          disabled={!selectedItem} // Disable until an item is selected
        />
         {getFieldError('quantityReceived') && <p id="quantityReceived-error" className="mt-1 text-xs text-red-600">{getFieldError('quantityReceived')}</p>}
         {maxReceivable !== undefined &&
             <p className="mt-1 text-xs text-gray-500">
                 Cannot receive more than {maxReceivable.toFixed(3)}.
             </p>
         }
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
        <SubmitButton pendingText="Receiving...">Receive Stock</SubmitButton>
      </div>
    </form>
  );
}