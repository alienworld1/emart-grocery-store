'use client';

import { createProductAction, CreateProductResult } from '@/actions/catalog';
import type { SelectOption } from '@/types';
import SubmitButton from './SubmitButton';
import { useEffect, useRef, useActionState } from 'react';

interface CreateProductFormProps {
  categories: SelectOption[];
  suppliers: SelectOption[];
}

export default function CreateProductForm({
  categories,
  suppliers,
}: CreateProductFormProps) {
  const initialState: CreateProductResult = {
    success: false,
    message: '',
    errorDetails: null,
  };
  const [state, formAction] = useActionState(createProductAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      console.log('Success:', state.message);
      // Potentially redirect: window.location.href = `/products/${state.newProductId}`;
    }
    if (
      !state.success &&
      state.message &&
      (typeof state.errorDetails === 'string' || !state.errorDetails)
    ) {
      console.error('Error:', state.message);
    }
    if (
      !state.success &&
      typeof state.errorDetails === 'object' &&
      state.errorDetails !== null
    ) {
      console.error('Validation Errors:', state.errorDetails);
    }
  }, [state]);

  const getFieldError = (fieldName: string): string | undefined => {
    if (
      state.errorDetails &&
      typeof state.errorDetails === 'object' &&
      !Array.isArray(state.errorDetails) &&
      fieldName in state.errorDetails &&
      Array.isArray(state.errorDetails[fieldName])
    ) {
      return state.errorDetails[fieldName].join(', ');
    }
    return undefined;
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto"
    >
      {/* General Message Area */}
      {state.message && (
        <div
          className={`p-3 rounded text-sm mb-4 ${state.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
        >
          {state.message}
          {!state.success && typeof state.errorDetails === 'string' && (
            <p className="mt-1 text-xs">{state.errorDetails}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* SKU */}
        <div>
          <label
            htmlFor="sku"
            className="block text-sm font-medium text-gray-700"
          >
            SKU
          </label>
          <input
            type="text"
            id="sku"
            name="sku"
            required
            minLength={3}
            className={`mt-1 block w-full input-field ${getFieldError('sku') ? 'input-error' : ''}`}
            aria-describedby="sku-error"
          />
          {getFieldError('sku') && (
            <p id="sku-error" className="input-error-text">
              {getFieldError('sku')}
            </p>
          )}
        </div>

        {/* Product Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Product Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            minLength={2}
            className={`mt-1 block w-full input-field ${getFieldError('name') ? 'input-error' : ''}`}
            aria-describedby="name-error"
          />
          {getFieldError('name') && (
            <p id="name-error" className="input-error-text">
              {getFieldError('name')}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="categoryId"
            className="block text-sm font-medium text-gray-700"
          >
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            className={`mt-1 block w-full select-field ${getFieldError('categoryId') ? 'input-error' : ''}`}
            aria-describedby="categoryId-error"
          >
            <option value="">Select a Category</option>
            {categories.map(c => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {getFieldError('categoryId') && (
            <p id="categoryId-error" className="input-error-text">
              {getFieldError('categoryId')}
            </p>
          )}
        </div>

        {/* Supplier */}
        <div>
          <label
            htmlFor="supplierId"
            className="block text-sm font-medium text-gray-700"
          >
            Supplier
          </label>
          <select
            id="supplierId"
            name="supplierId"
            required
            className={`mt-1 block w-full select-field ${getFieldError('supplierId') ? 'input-error' : ''}`}
            aria-describedby="supplierId-error"
          >
            <option value="">Select a Supplier</option>
            {suppliers.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {getFieldError('supplierId') && (
            <p id="supplierId-error" className="input-error-text">
              {getFieldError('supplierId')}
            </p>
          )}
        </div>

        {/* Unit of Measure */}
        <div>
          <label
            htmlFor="unitOfMeasure"
            className="block text-sm font-medium text-gray-700"
          >
            Unit of Measure
          </label>
          <input
            type="text"
            id="unitOfMeasure"
            name="unitOfMeasure"
            required
            placeholder="e.g., kg, pcs, pack, liter"
            className={`mt-1 block w-full input-field ${getFieldError('unitOfMeasure') ? 'input-error' : ''}`}
            aria-describedby="unitOfMeasure-error"
          />
          {getFieldError('unitOfMeasure') && (
            <p id="unitOfMeasure-error" className="input-error-text">
              {getFieldError('unitOfMeasure')}
            </p>
          )}
        </div>

        {/* Description (Full Width) */}
        <div className="md:col-span-2">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="mt-1 block w-full textarea-field"
          ></textarea>
        </div>

        {/* Purchase Price */}
        <div>
          <label
            htmlFor="purchasePrice"
            className="block text-sm font-medium text-gray-700"
          >
            Purchase Price
          </label>
          <input
            type="number"
            id="purchasePrice"
            name="purchasePrice"
            min="0"
            step="0.01"
            defaultValue="0"
            className={`mt-1 block w-full input-field ${getFieldError('purchasePrice') ? 'input-error' : ''}`}
            aria-describedby="purchasePrice-error"
          />
          {getFieldError('purchasePrice') && (
            <p id="purchasePrice-error" className="input-error-text">
              {getFieldError('purchasePrice')}
            </p>
          )}
        </div>

        {/* Selling Price */}
        <div>
          <label
            htmlFor="sellingPrice"
            className="block text-sm font-medium text-gray-700"
          >
            Selling Price
          </label>
          <input
            type="number"
            id="sellingPrice"
            name="sellingPrice"
            min="0"
            step="0.01"
            defaultValue="0"
            className={`mt-1 block w-full input-field ${getFieldError('sellingPrice') ? 'input-error' : ''}`}
            aria-describedby="sellingPrice-error"
          />
          {getFieldError('sellingPrice') && (
            <p id="sellingPrice-error" className="input-error-text">
              {getFieldError('sellingPrice')}
            </p>
          )}
        </div>

        {/* Reorder Level */}
        <div>
          <label
            htmlFor="reorderLevel"
            className="block text-sm font-medium text-gray-700"
          >
            Reorder Level
          </label>
          <input
            type="number"
            id="reorderLevel"
            name="reorderLevel"
            min="0"
            step="any"
            defaultValue="0"
            className={`mt-1 block w-full input-field ${getFieldError('reorderLevel') ? 'input-error' : ''}`}
            aria-describedby="reorderLevel-error"
          />
          {getFieldError('reorderLevel') && (
            <p id="reorderLevel-error" className="input-error-text">
              {getFieldError('reorderLevel')}
            </p>
          )}
        </div>

        {/* Target Stock Level */}
        <div>
          <label
            htmlFor="targetStockLevel"
            className="block text-sm font-medium text-gray-700"
          >
            Target Stock Level
          </label>
          <input
            type="number"
            id="targetStockLevel"
            name="targetStockLevel"
            min="0"
            step="any"
            defaultValue="0"
            className={`mt-1 block w-full input-field ${getFieldError('targetStockLevel') ? 'input-error' : ''}`}
            aria-describedby="targetStockLevel-error"
          />
          {getFieldError('targetStockLevel') && (
            <p id="targetStockLevel-error" className="input-error-text">
              {getFieldError('targetStockLevel')}
            </p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4 md:col-span-2">
        <SubmitButton pendingText="Creating...">Create Product</SubmitButton>
      </div>
    </form>
  );
}
