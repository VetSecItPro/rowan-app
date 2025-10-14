'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Calendar, Clock, MapPin, Tag } from 'lucide-react';
import { parseEventText, getEventSuggestions, isValidParsedEvent } from '@/lib/services/natural-language-parser';
import { format } from 'date-fns';

interface QuickAddEventProps {
  onCreateEvent: (eventData: any) => void;
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
}

export function QuickAddEvent({ onCreateEvent, isOpen, onClose, spaceId }: QuickAddEventProps) {
  const [input, setInput] = useState('');
  const [parsedPreview, setParsedPreview] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (input.trim().length > 3) {
      const parsed = parseEventText(input);
      setParsedPreview(parsed);
    } else {
      setParsedPreview(null);
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    const parsed = parseEventText(input);

    if (!isValidParsedEvent(parsed)) {
      alert('Please enter a valid event description');
      return;
    }

    // Create event with parsed data
    onCreateEvent({
      space_id: spaceId,
      title: parsed.title,
      start_time: parsed.startTime?.toISOString() || new Date().toISOString(),
      end_time: parsed.endTime?.toISOString(),
      location: parsed.location || '',
      category: parsed.category || 'personal',
      is_recurring: parsed.isRecurring || false,
      recurrence_pattern: parsed.recurrencePattern ? {
        frequency: parsed.recurrencePattern,
        interval: 1
      } : null,
    });

    // Reset and close
    setInput('');
    setParsedPreview(null);
    onClose();
  };

  const handleUseSuggestion = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border-2 border-purple-200 dark:border-purple-700 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-calendar p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Quick Add Event</h2>
              <p className="text-xs text-purple-100">Type naturally, like "Dinner tomorrow at 7pm"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Try: "Doctor appointment next Tuesday at 2pm" or "Weekly team meeting every Monday at 10am"'
              className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-purple-200 dark:border-purple-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white text-lg placeholder:text-gray-400"
              autoComplete="off"
            />
          </div>

          {/* Parsed Preview */}
          {parsedPreview && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-purple-900 dark:text-purple-100">
                <Sparkles className="w-4 h-4" />
                <span>AI Detected:</span>
              </div>

              <div className="grid gap-2">
                {parsedPreview.title && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">Title</div>
                      <div className="text-sm text-gray-900 dark:text-white font-medium">{parsedPreview.title}</div>
                    </div>
                  </div>
                )}

                {parsedPreview.startTime && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">When</div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {format(parsedPreview.startTime, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                        {parsedPreview.endTime && (
                          <span className="text-gray-600 dark:text-gray-400">
                            {' '}- {format(parsedPreview.endTime, 'h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {parsedPreview.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">Location</div>
                      <div className="text-sm text-gray-900 dark:text-white">{parsedPreview.location}</div>
                    </div>
                  </div>
                )}

                {parsedPreview.category && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">Category</div>
                      <div className="text-sm text-gray-900 dark:text-white capitalize">{parsedPreview.category}</div>
                    </div>
                  </div>
                )}

                {parsedPreview.isRecurring && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg w-fit">
                    <div className="text-xs font-medium text-purple-700 dark:text-purple-300">
                      🔁 Recurring: {parsedPreview.recurrencePattern}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {!input && showSuggestions && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Try these examples:</div>
              <div className="grid gap-2">
                {getEventSuggestions().slice(0, 4).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleUseSuggestion(suggestion)}
                    className="text-left px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-sm text-gray-700 dark:text-gray-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex-1 px-6 py-3 bg-gradient-calendar text-white rounded-xl hover:opacity-90 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Create Event
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-medium text-sm"
            >
              Cancel
            </button>
          </div>

          {!input && !showSuggestions && (
            <button
              type="button"
              onClick={() => setShowSuggestions(true)}
              className="w-full text-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              Show example phrases →
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
