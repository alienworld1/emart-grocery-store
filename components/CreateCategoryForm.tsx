'use client';

import { createCategoryAction, CreateCategoryResult } from '@/actions/catalog';
import SubmitButton from './SubmitButton';
import { useEffect, useRef, useActionState } from 'react';

export default function CreateCategoryForm() {
  const initialState: CreateCategoryResult = {
    success: false,
    message: '',
    errorDetails: null,
  };
  const [state, formAction] = useActionState(
    createCategoryAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      // Add toast notification here if desired
      console.log('Success:', state.message);
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
      typeof state.errorDetails === 'object' &&
      state.errorDetails &&
      state.errorDetails[fieldName]
    ) {
      return state.errorDetails[fieldName].join(', ');
    }
    return undefined;
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto"
    >
      {/* General Message Area */}
      {state.message && (
        <div
          className={`p-3 rounded text-sm mb-4 ${state.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
        >
          {state.message}
          {/* Display general DB error if no field-specific errors */}
          {!state.success && typeof state.errorDetails === 'string' && (
            <p className="mt-1 text-xs">{state.errorDetails}</p>
          )}
        </div>
      )}

      {/* Category Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Category Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          minLength={2}
          className={`mt-1 block w-full shadow-sm sm:text-sm border ${getFieldError('name') ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500`}
          aria-describedby="name-error"
        />
        {getFieldError('name') && (
          <p id="name-error" className="mt-1 text-xs text-red-600">
            {getFieldError('name')}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
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
          className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
        ></textarea>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <SubmitButton pendingText="Creating...">Create Category</SubmitButton>
      </div>
    </form>
  );
}
