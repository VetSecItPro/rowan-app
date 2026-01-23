'use client';

import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useScrollLock } from '@/lib/hooks/useScrollLock';
import { useDevice } from '@/lib/contexts/DeviceContext';

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
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const isHydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [calendarDate, setCalendarDate] = useState<Date>(() => {
    if (value) {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  });

  // Use device detection from context
  // Show mobile UI on small screens OR touch devices (bottom sheets work better with touch)
  const { isMobile: isSmallScreen, hasCoarsePointer } = useDevice();
  const isMobile = isSmallScreen || hasCoarsePointer;

  // Lock scroll when picker is open on mobile (bottom sheet mode)
  useScrollLock(isOpen && isMobile);

  // Parse existing value into date and time components
  useEffect(() => {
    queueMicrotask(() => {
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
    });
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

  // Generate calendar days for the current calendar month
  const generateCalendarDays = () => {
    const currentMonth = calendarDate.getMonth();
    const currentYear = calendarDate.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
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

  if (!isHydrated) {
    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
        )}
        <input
          ref={inputRef}
          type="text"
          defaultValue={manualInput}
          disabled={disabled}
          readOnly
          className={`w-full px-4 py-3 pr-10 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
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
          className={`w-full px-4 py-3 pr-20 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          placeholder={placeholder}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {manualInput && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Clear date"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Open calendar"
          >
            <Calendar className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Portal Calendar - Mobile: Full screen bottom sheet, Desktop: Positioned dropdown */}
      {isOpen && isHydrated && createPortal(
        <>
          {/* Mobile backdrop overlay */}
          {isMobile && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
              onClick={() => setIsOpen(false)}
            />
          )}

          <div
            ref={calendarRef}
            className={`bg-gray-800 border border-gray-700 shadow-2xl ${
              isMobile
                ? 'fixed inset-x-0 bottom-0 rounded-t-2xl p-4 pb-safe max-h-[85vh] overflow-y-auto animate-bottom-sheet'
                : 'absolute rounded-lg p-4'
            }`}
            style={isMobile ? {
              zIndex: 10000
            } : {
              top: position.top,
              left: position.left,
              width: 400,
              maxWidth: 'calc(100vw - 32px)',
              zIndex: 10000
            }}
          >
            {/* Mobile drag handle */}
            {isMobile && (
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 bg-gray-600 rounded-full" />
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* Calendar */}
              <div>
                {/* Month Navigation Header */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={goToPreviousMonth}
                    className={`hover:bg-gray-700 rounded-lg transition-colors active:scale-95 ${
                      isMobile ? 'p-3 min-w-[44px] min-h-[44px]' : 'p-1'
                    }`}
                    title="Previous month"
                  >
                    <ChevronLeft className={`text-gray-400 ${isMobile ? 'w-6 h-6' : 'w-4 h-4'}`} />
                  </button>

                  <div className={`font-medium text-gray-300 ${isMobile ? 'text-base' : 'text-sm'}`}>
                    {new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={goToNextMonth}
                    className={`hover:bg-gray-700 rounded-lg transition-colors active:scale-95 ${
                      isMobile ? 'p-3 min-w-[44px] min-h-[44px]' : 'p-1'
                    }`}
                    title="Next month"
                  >
                    <ChevronRight className={`text-gray-400 ${isMobile ? 'w-6 h-6' : 'w-4 h-4'}`} />
                  </button>
                </div>

                <div className={`grid grid-cols-7 gap-1 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div
                      key={day}
                      className={`text-center font-medium text-gray-400 ${
                        isMobile ? 'p-3' : 'p-2'
                      }`}
                    >
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
                        className={`text-center hover:bg-gray-700 rounded-lg transition-colors active:scale-95 ${
                          isMobile ? 'p-3 min-w-[44px] min-h-[44px] text-base' : 'p-2'
                        } ${
                          !isCurrentMonth ? 'text-gray-600' : 'text-white'
                        } ${isToday ? 'bg-blue-900 text-blue-400' : ''} ${
                          isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
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
                <div className={`font-medium text-gray-300 mb-3 flex items-center gap-2 ${
                  isMobile ? 'text-base' : 'text-sm'
                }`}>
                  <Clock className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
                  Time
                </div>

                <div className={`overflow-y-auto border border-gray-600 rounded-lg overscroll-contain ${
                  isMobile ? 'max-h-40' : 'max-h-32'
                }`}>
                  {timeOptions.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleTimeChange(time)}
                      className={`w-full text-left hover:bg-gray-700 transition-colors active:scale-[0.99] ${
                        isMobile ? 'px-4 py-3 text-base min-h-[44px]' : 'px-3 py-2 text-sm'
                      } ${
                        selectedTime === time ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-white'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-between gap-2 ${isMobile ? 'mt-6' : 'mt-4'}`}>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const nowDate = now.toISOString().split('T')[0];
                  const nowTime = now.toTimeString().split(' ')[0].substring(0, 5);
                  handleDateChange(nowDate);
                  handleTimeChange(nowTime);
                }}
                className={`bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors active:scale-95 ${
                  isMobile ? 'px-4 py-3 text-base min-h-[44px]' : 'px-3 py-2 text-sm'
                }`}
              >
                Now
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={`text-gray-400 hover:text-gray-200 transition-colors ${
                    isMobile ? 'px-4 py-3 text-base min-h-[44px]' : 'px-4 py-2 text-sm'
                  }`}
                >
                  Cancel
                </button>

                {(selectedDate || selectedTime) && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className={`bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 active:scale-95 ${
                      isMobile ? 'px-6 py-3 text-base min-h-[44px]' : 'px-4 py-2 text-sm'
                    }`}
                  >
                    <Check className={isMobile ? 'w-4 h-4' : 'w-3 h-3'} />
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

let hydrated = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => hydrated;
const getServerSnapshot = () => false;

if (typeof window !== 'undefined' && !hydrated) {
  const notify = () => {
    hydrated = true;
    listeners.forEach((listener) => listener());
  };
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(notify);
  } else {
    Promise.resolve().then(notify);
  }
}
