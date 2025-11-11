'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
  disabled = false
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate dropdown position
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4, // 4px gap
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        triggerRef.current &&
        dropdownRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Close dropdown on scroll (but not when scrolling within the dropdown itself)
  useEffect(() => {
    const handleScroll = (event: Event) => {
      if (isOpen && dropdownRef.current) {
        // Don't close if the scroll is happening within our dropdown
        const target = event.target as Node;
        if (dropdownRef.current.contains(target)) {
          return;
        }
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  const selectedOption = options.find(option => option.value === value);

  const handleOptionSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (isOpen) {
          // Focus first option
          dropdownRef.current?.querySelector('button')?.focus();
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          // Focus last option
          const buttons = dropdownRef.current?.querySelectorAll('button');
          if (buttons && buttons.length > 0) {
            (buttons[buttons.length - 1] as HTMLButtonElement).focus();
          }
        } else {
          setIsOpen(true);
        }
        break;
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent, optionValue: string, index: number) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleOptionSelect(optionValue);
        break;
      case 'ArrowDown':
        event.preventDefault();
        const nextButton = event.currentTarget.parentElement?.children[index + 1] as HTMLButtonElement;
        if (nextButton) {
          nextButton.focus();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (index === 0) {
          triggerRef.current?.focus();
        } else {
          const prevButton = event.currentTarget.parentElement?.children[index - 1] as HTMLButtonElement;
          if (prevButton) {
            prevButton.focus();
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
    }
  };

  // Don't render dropdown portal on server side
  if (!mounted) {
    return (
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={`
          w-full px-4 py-3 pr-10 text-left
          bg-gray-50 dark:bg-gray-900
          border border-gray-300 dark:border-gray-600
          rounded-xl
          focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          text-gray-900 dark:text-white
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        <span className="block truncate min-h-[1.25rem] flex items-center">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      </button>
    );
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`
          relative w-full min-w-0 px-4 py-3 pr-10 text-left
          bg-gray-50 dark:bg-gray-900
          border border-gray-300 dark:border-gray-600
          rounded-xl
          focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          text-gray-900 dark:text-white
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${isOpen ? 'ring-2 ring-indigo-500 border-transparent' : ''}
          ${className}
        `}
      >
        <span className="block truncate min-h-[1.25rem] flex items-center">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`
            absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none
            transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
          `}
        />
      </button>

      {/* Portal Dropdown */}
      {isOpen && mounted && createPortal(
        <div
          ref={dropdownRef}
          className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto z-50"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
            zIndex: 10000
          }}
          role="listbox"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionSelect(option.value)}
              onKeyDown={(e) => handleOptionKeyDown(e, option.value, index)}
              className={`
                w-full px-4 py-2 text-left text-sm
                hover:bg-gray-100 dark:hover:bg-gray-700
                focus:bg-gray-100 dark:focus:bg-gray-700
                focus:outline-none
                transition-colors
                ${option.value === value ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}
              `}
              role="option"
              aria-selected={option.value === value}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}