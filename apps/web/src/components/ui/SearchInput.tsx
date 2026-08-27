import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, containerClassName, value, onChange, onClear, placeholder = 'Search...', ...props }, ref) => {
    const hasValue = value !== undefined && value !== '';

    return (
      <div className={cn('relative flex items-center w-full', containerClassName)}>
        <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(
            'w-full pl-9 pr-8 py-2 rounded-btn border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            className
          )}
          {...props}
        />

        {hasValue && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded focus:outline-none"
            aria-label="Clear search query"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
