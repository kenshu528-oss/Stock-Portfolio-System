import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ 
  label, 
  error, 
  className = '', 
  ...props 
}, ref) => {
  const baseClasses = 'flex h-10 w-full rounded-md border bg-slate-700 border-slate-600 text-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50';
  
  const errorClasses = error ? 'border-red-500 focus-visible:ring-red-500' : '';
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-slate-300 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;