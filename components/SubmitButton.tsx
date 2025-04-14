"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pendingText?: string;
}

export default function SubmitButton({ children, pendingText = "Saving...", ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      aria-disabled={pending || props.disabled}
      className={`px-4 py-2 font-semibold rounded-md shadow-sm transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        pending
          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
          : props.disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
      } ${props.className}`} // Allow passing additional classes
    >
      {pending ? pendingText : children}
    </button>
  );
}