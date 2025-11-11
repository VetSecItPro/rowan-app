'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time...",
  className = "",
  disabled = false,
  label
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse existing value into date and time components
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const dateStr = date.toISOString().split('T')[0];
          const timeStr = date.toTimeString().split(' ')[0].substring(0, 5);
          setSelectedDate(dateStr);
          setSelectedTime(timeStr);
          setManualInput(value);
          // Update calendar month to match the selected date
          setCalendarDate(date);
        } else {
          setManualInput(value);
        }
      } catch {
        setManualInput(value);
      }
    } else {
      setSelectedDate('');
      setSelectedTime('');
      setManualInput('');
    }
  }, [value]);

  // Calculate calendar position
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        inputRef.current &&
        calendarRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Handle manual input change
  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setManualInput(inputValue);
    onChange(inputValue);
  };

  // Handle date selection from calendar
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    updateDateTime(date, selectedTime);
  };

  // Handle time selection
  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    updateDateTime(selectedDate, time);
  };

  // Update combined datetime value
  const updateDateTime = (date: string, time: string) => {
    if (date && time) {
      const datetime = `${date}T${time}`;
      setManualInput(datetime);
      onChange(datetime);
    } else if (date) {
      setManualInput(date);
      onChange(date);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  // Clear value
  const handleClear = () => {
    setSelectedDate('');
    setSelectedTime('');
    setManualInput('');
    onChange('');
    inputRef.current?.focus();
  };

  // Calendar navigation state
  const [calendarDate, setCalendarDate] = useState<Date>(() => {
    if (value) {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  });

  // Generate calendar days for the current calendar month
  const generateCalendarDays = () => {
    const currentMonth = calendarDate.getMonth();
    const currentYear = calendarDate.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();
  const currentMonth = calendarDate.getMonth();
  const currentYear = calendarDate.getFullYear();

  // Navigation functions
  const goToPreviousMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Generate time options (every 30 minutes)
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeStr);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  if (!mounted) {
    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <input
          ref={inputRef}
          type="text"
          value={manualInput}
          disabled={disabled}
          className={`w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={manualInput}
          onChange={handleManualInputChange}
          onFocus={handleInputFocus}
          disabled={disabled}
          className={`w-full px-4 py-3 pr-20 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          placeholder={placeholder}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {manualInput && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Clear date"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Open calendar"
          >
            <Calendar className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Portal Calendar */}
      {isOpen && mounted && createPortal(
        <div
          ref={calendarRef}
          className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 p-4"
          style={{
            top: position.top,
            left: position.left,
            width: 400,
            maxWidth: 'calc(100vw - 32px)',
            zIndex: 10000
          }}
        >
          <div className="flex flex-col gap-4">
            {/* Calendar */}
            <div>
              {/* Month Navigation Header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>

                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>

                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-xs">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div key={day} className="p-2 text-center font-medium text-gray-500 dark:text-gray-400">
                    {day}
                  </div>
                ))}

                {calendarDays.map((day, idx) => {
                  const isCurrentMonth = day.getMonth() === currentMonth;
                  const isToday = day.toDateString() === today.toDateString();
                  const isSelected = selectedDate === day.toISOString().split('T')[0];

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDateChange(day.toISOString().split('T')[0])}
                      className={`p-2 text-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${
                        !isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-900 dark:text-white'
                      } ${isToday ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''} ${
                        isSelected ? 'bg-blue-500 text-white' : ''
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Picker */}
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time
              </div>

              <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded">
                {timeOptions.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeChange(time)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      selectedTime === time ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const nowDate = now.toISOString().split('T')[0];
                const nowTime = now.toTimeString().split(' ')[0].substring(0, 5);
                handleDateChange(nowDate);
                handleTimeChange(nowTime);
              }}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Now
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>

              {(selectedDate || selectedTime) && (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3 h-3" />
                  Done
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}