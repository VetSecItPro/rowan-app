'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Calendar, Clock, MapPin, Tag, Wand2, FileText, AlertCircle, Loader2, Users } from 'lucide-react';
import { parseEventText, getEventSuggestions, isValidParsedEvent } from '@/lib/services/natural-language-parser';
import { format } from 'date-fns';
import type { AIParseResult } from '@/lib/services/ai/event-parser-service';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { showWarning } from '@/lib/utils/toast';
import type { CreateEventInput } from '@/lib/services/calendar-service';

interface QuickAddEventProps {
  onCreateEvent: (eventData: CreateEventInput) => void;
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
}

type ParseMode = 'quick' | 'ai';

interface PreviewData {
  title: string;
  startTime?: Date | string;
  endTime?: Date | string;
  location?: string;
  category?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  description?: string;
  attendees?: string[];
  confidence?: number;
}

/** Provides a streamlined form for quickly adding a new calendar event. */
export function QuickAddEvent({ onCreateEvent, isOpen, onClose, spaceId }: QuickAddEventProps) {
  const [input, setInput] = useState('');
  const [parseMode, setParseMode] = useState<ParseMode>('quick');
  const [parsedPreview, setParsedPreview] = useState<PreviewData | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (parseMode === 'quick' && inputRef.current) {
        inputRef.current.focus();
      } else if (parseMode === 'ai' && textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [isOpen, parseMode]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setInput('');
      setParsedPreview(null);
      setAiError(null);
      setShowSuggestions(false);
    }
  }, [isOpen]);

  // Local parsing for quick mode (real-time)
  useEffect(() => {
    if (parseMode === 'quick' && input.trim().length > 3) {
      const parsed = parseEventText(input);
      setParsedPreview({
        title: parsed.title,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        location: parsed.location,
        category: parsed.category,
        isRecurring: parsed.isRecurring,
        recurrencePattern: parsed.recurrencePattern,
      });
    } else if (parseMode === 'quick') {
      setParsedPreview(null);
    }
  }, [input, parseMode]);

  // AI parsing with debounce for AI mode
  const parseWithAI = useCallback(async (text: string) => {
    if (!text.trim() || text.length < 10) {
      setParsedPreview(null);
      return;
    }

    setIsAILoading(true);
    setAiError(null);

    try {
      const response = await csrfFetch('/api/calendar/parse-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setAiError('Rate limit exceeded. Please try again later or use Quick mode.');
        } else {
          setAiError(data.error || 'Failed to parse event');
        }
        return;
      }

      if (data.rateLimitRemaining !== undefined) {
        setRateLimitRemaining(data.rateLimitRemaining);
      }

      const event: AIParseResult = data.event;
      setParsedPreview({
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        category: event.category,
        isRecurring: event.isRecurring,
        recurrencePattern: event.recurrencePattern,
        description: event.description,
        attendees: event.attendees,
        confidence: event.confidence,
      });
    } catch (error) {
      logger.error('[QuickAddEvent] AI parsing error:', error, { component: 'QuickAddEvent', action: 'component_action' });
      setAiError('Failed to connect to AI service');
    } finally {
      setIsAILoading(false);
    }
  }, []);

  // Debounced AI parsing
  useEffect(() => {
    if (parseMode === 'ai') {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (input.trim().length >= 10) {
        debounceRef.current = setTimeout(() => {
          parseWithAI(input);
        }, 800); // Wait 800ms after user stops typing
      } else {
        setParsedPreview(null);
      }
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [input, parseMode, parseWithAI]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    if (parseMode === 'quick') {
      const parsed = parseEventText(input);

      if (!isValidParsedEvent(parsed)) {
        showWarning('Please enter a valid event description');
        return;
      }

      onCreateEvent({
        space_id: spaceId,
        title: parsed.title,
        start_time: parsed.startTime?.toISOString() || new Date().toISOString(),
        end_time: parsed.endTime?.toISOString(),
        location: parsed.location || '',
        category: parsed.category || 'personal',
        is_recurring: parsed.isRecurring || false,
        recurrence_pattern: parsed.recurrencePattern || undefined,
      });
    } else {
      // AI mode - use parsed preview
      if (!parsedPreview || !parsedPreview.title) {
        showWarning('Please wait for AI to parse the event or enter valid text');
        return;
      }

      onCreateEvent({
        space_id: spaceId,
        title: parsedPreview.title,
        start_time: parsedPreview.startTime
          ? (typeof parsedPreview.startTime === 'string'
              ? parsedPreview.startTime
              : parsedPreview.startTime.toISOString())
          : new Date().toISOString(),
        end_time: parsedPreview.endTime
          ? (typeof parsedPreview.endTime === 'string'
              ? parsedPreview.endTime
              : parsedPreview.endTime.toISOString())
          : undefined,
        location: parsedPreview.location || '',
        description: parsedPreview.description || '',
        category: (parsedPreview.category as 'work' | 'personal' | 'family' | 'health' | 'social') || 'personal',
        is_recurring: parsedPreview.isRecurring || false,
        recurrence_pattern: parsedPreview.recurrencePattern || undefined,
      });
    }

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

  const handleModeSwitch = (mode: ParseMode) => {
    setParseMode(mode);
    setInput('');
    setParsedPreview(null);
    setAiError(null);
  };

  const formatDateForPreview = (dateInput: Date | string | undefined): string | null => {
    if (!dateInput) return null;
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return format(date, 'EEEE, MMMM d, yyyy \'at\' h:mm a');
    } catch {
      return null;
    }
  };

  const formatTimeForPreview = (dateInput: Date | string | undefined): string | null => {
    if (!dateInput) return null;
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return format(date, 'h:mm a');
    } catch {
      return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-20 px-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border-2 border-purple-700 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
        {/* Header */}
        <div className="bg-purple-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Quick Add Event</h2>
              <p className="text-xs text-purple-100">
                {parseMode === 'quick'
                  ? 'Type naturally, like "Dinner tomorrow at 7pm"'
                  : 'Paste an email or meeting invite for AI parsing'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-4">
          <div className="flex gap-2 p-1 bg-gray-900 rounded-full">
            <button
              type="button"
              onClick={() => handleModeSwitch('quick')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                parseMode === 'quick'
                  ? 'bg-gray-700 text-purple-400 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              Quick Parse
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('ai')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                parseMode === 'ai'
                  ? 'bg-gray-700 text-purple-400 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              AI Parse (Email/Text)
            </button>
          </div>
          {parseMode === 'ai' && rateLimitRemaining !== null && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              {rateLimitRemaining} AI parses remaining this hour
            </p>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {parseMode === 'quick' ? (
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Try: "Doctor appointment next Tuesday at 2pm" or "Weekly team meeting every Monday at 10am"'
                className="w-full px-4 py-4 bg-gray-900 border-2 border-purple-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-lg placeholder:text-gray-500"
                autoComplete="off"
              />
            </div>
          ) : (
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste an email, meeting invite, or any text containing event details...

Example:
Hi Team,

Let's schedule a project review meeting for next Wednesday at 2:00 PM in Conference Room B.
The meeting will last about 90 minutes.

Please confirm your attendance.

Best,
Sarah"
                className="w-full px-4 py-4 bg-gray-900 border-2 border-purple-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm placeholder:text-gray-500 min-h-[200px] resize-y"
              />
              {isAILoading && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 text-purple-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Parsing...</span>
                </div>
              )}
            </div>
          )}

          {/* AI Error */}
          {aiError && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedPreview && (
            <div className="bg-purple-900/20 border border-purple-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-purple-100">
                  <Sparkles className="w-4 h-4" />
                  <span>{parseMode === 'ai' ? 'AI Detected' : 'Detected'}:</span>
                </div>
                {parsedPreview.confidence !== undefined && (
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    parsedPreview.confidence >= 0.8
                      ? 'bg-green-900/30 text-green-400'
                      : parsedPreview.confidence >= 0.5
                      ? 'bg-yellow-900/30 text-yellow-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}>
                    {Math.round(parsedPreview.confidence * 100)}% confident
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                {parsedPreview.title && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-purple-300 font-medium">Title</div>
                      <div className="text-sm text-white font-medium">{parsedPreview.title}</div>
                    </div>
                  </div>
                )}

                {parsedPreview.startTime && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-purple-300 font-medium">When</div>
                      <div className="text-sm text-white">
                        {formatDateForPreview(parsedPreview.startTime)}
                        {parsedPreview.endTime && (
                          <span className="text-gray-400">
                            {' '}- {formatTimeForPreview(parsedPreview.endTime)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {parsedPreview.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-purple-300 font-medium">Location</div>
                      <div className="text-sm text-white">{parsedPreview.location}</div>
                    </div>
                  </div>
                )}

                {parsedPreview.category && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-purple-300 font-medium">Category</div>
                      <div className="text-sm text-white capitalize">{parsedPreview.category}</div>
                    </div>
                  </div>
                )}

                {parsedPreview.attendees && parsedPreview.attendees.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-purple-300 font-medium">Attendees</div>
                      <div className="text-sm text-white">{parsedPreview.attendees.join(', ')}</div>
                    </div>
                  </div>
                )}

                {parsedPreview.isRecurring && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 rounded-lg w-fit">
                    <div className="text-xs font-medium text-purple-300">
                      Recurring: {parsedPreview.recurrencePattern}
                    </div>
                  </div>
                )}

                {parsedPreview.description && (
                  <div className="mt-2 pt-2 border-t border-purple-700">
                    <div className="text-xs text-purple-300 font-medium mb-1">Notes</div>
                    <div className="text-sm text-gray-300 line-clamp-3">
                      {parsedPreview.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suggestions (only for quick mode) */}
          {parseMode === 'quick' && !input && showSuggestions && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-300">Try these examples:</div>
              <div className="grid gap-2">
                {getEventSuggestions().slice(0, 4).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleUseSuggestion(suggestion)}
                    className="text-left px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg hover:border-purple-600 hover:bg-purple-900/20 transition-all text-sm text-gray-300"
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
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!input.trim() || (parseMode === 'ai' && (isAILoading || !parsedPreview))}
              className="flex-1 px-6 py-2.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Create Event
            </button>
          </div>

          {parseMode === 'quick' && !input && !showSuggestions && (
            <button
              type="button"
              onClick={() => setShowSuggestions(true)}
              className="w-full text-center text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              Show example phrases
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
