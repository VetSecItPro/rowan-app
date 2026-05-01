/**
 * Share landing page for the PWA Web Share Target.
 *
 * Reached via redirect from /share/submit/route.ts after the OS hands
 * a shared payload off to Rowan via the system share sheet.
 *
 * The route handler decides a `destination` (recipe / calendar /
 * task / unknown) and forwards us here with the shared content
 * encoded as URL params. This page renders a confirmation UI so
 * the user can pick or override the routing decision before any
 * DB write happens.
 *
 * Why a confirmation step (not auto-route on high confidence):
 * - Mis-routed shares are annoying and create cleanup work.
 * - Many recipe sites also publish news/op-eds; URL alone can be
 *   ambiguous.
 * - The user gets visual confirmation that "Rowan caught the share"
 *   which is the trust signal we want when introducing share-target.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChefHat,
  CalendarDays,
  ListChecks,
  AlertCircle,
  ArrowRight,
  X,
  ExternalLink,
} from 'lucide-react';

type Destination = 'recipe' | 'calendar' | 'task' | 'unknown';

interface SharedPayload {
  title: string;
  text: string;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  destination: Destination;
}

export default function SharePage() {
  const router = useRouter();
  const params = useSearchParams();

  const payload: SharedPayload = {
    title: params.get('title') ?? '',
    text: params.get('text') ?? '',
    url: params.get('url') ?? '',
    fileName: params.get('fileName') ?? '',
    fileType: params.get('fileType') ?? '',
    fileSize: Number(params.get('fileSize') ?? 0),
    destination: (params.get('destination') as Destination) ?? 'unknown',
  };

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If nothing was shared at all, bounce back to dashboard so users
  // who land on /share directly aren't stuck on a confused screen.
  useEffect(() => {
    if (!payload.title && !payload.text && !payload.url && !payload.fileName) {
      router.replace('/dashboard');
    }
  }, [payload, router]);

  const handleSendTo = async (target: Destination) => {
    setSubmitting(true);
    setError(null);
    try {
      const dest = await routeToDestination(target, payload);
      router.replace(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the shared content. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-4 py-10 flex items-start justify-center">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Save to Rowan</h1>
          <button
            onClick={() => router.replace('/dashboard')}
            aria-label="Cancel and go to dashboard"
            className="rounded-md p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <SharedPreview payload={payload} />

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <p className="mt-6 mb-3 text-sm text-gray-400">
          {payload.destination === 'unknown'
            ? 'Where should this go?'
            : 'Rowan picked the most likely spot. Switch it if needed.'}
        </p>

        <div className="space-y-2">
          <DestinationButton
            label="Save as recipe"
            description="Pulls ingredients and steps from the link"
            icon={ChefHat}
            disabled={!payload.url || submitting}
            primary={payload.destination === 'recipe'}
            onClick={() => handleSendTo('recipe')}
          />
          <DestinationButton
            label="Add to calendar"
            description={
              payload.fileName?.endsWith('.ics')
                ? `Import .ics file (${formatBytes(payload.fileSize)})`
                : 'Create a calendar event'
            }
            icon={CalendarDays}
            disabled={submitting}
            primary={payload.destination === 'calendar'}
            onClick={() => handleSendTo('calendar')}
          />
          <DestinationButton
            label="Create a task"
            description="Add a to-do with the link or text attached"
            icon={ListChecks}
            disabled={submitting}
            primary={payload.destination === 'task'}
            onClick={() => handleSendTo('task')}
          />
        </div>

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}

function SharedPreview({ payload }: { payload: SharedPayload }) {
  const hasContent =
    payload.title || payload.text || payload.url || payload.fileName;
  if (!hasContent) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
      {payload.title && (
        <p className="font-medium text-white line-clamp-2">{payload.title}</p>
      )}
      {payload.text && !payload.title && (
        <p className="text-sm text-gray-300 line-clamp-3">{payload.text}</p>
      )}
      {payload.text && payload.title && (
        <p className="mt-1 text-sm text-gray-400 line-clamp-2">{payload.text}</p>
      )}
      {payload.url && (
        <a
          href={payload.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 break-all"
        >
          <ExternalLink className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          <span className="truncate max-w-[400px]">{prettyHostname(payload.url)}</span>
        </a>
      )}
      {payload.fileName && (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400">
          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            file
          </span>
          {payload.fileName}
          {payload.fileSize > 0 && (
            <span className="text-gray-500">· {formatBytes(payload.fileSize)}</span>
          )}
        </p>
      )}
    </div>
  );
}

function DestinationButton({
  label,
  description,
  icon: Icon,
  primary,
  disabled,
  onClick,
}: {
  label: string;
  description: string;
  icon: typeof ChefHat;
  primary: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        'w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition ' +
        (primary
          ? 'bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 disabled:cursor-wait'
          : 'bg-gray-900 hover:bg-gray-800 border border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed')
      }
    >
      <span
        className={
          'flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ' +
          (primary ? 'bg-blue-500/30' : 'bg-gray-800')
        }
      >
        <Icon className="w-5 h-5" aria-hidden="true" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-white/60 line-clamp-1">{description}</span>
      </span>
      <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-60" aria-hidden="true" />
    </button>
  );
}

async function routeToDestination(
  target: Destination,
  payload: SharedPayload
): Promise<string> {
  switch (target) {
    case 'recipe': {
      // Recipes are imported by URL via the existing parse endpoint.
      // Land the user on the recipes new-via-URL flow with the URL
      // pre-filled; that page can call /api/recipes/parse on its own
      // (which is already SSRF-defended via per-hop URL re-validation).
      if (!payload.url) {
        throw new Error('A URL is required to import a recipe.');
      }
      return `/recipes?import=${encodeURIComponent(payload.url)}`;
    }

    case 'calendar': {
      // Two paths: an .ics file (must be uploaded from the authenticated
      // session) or a text/title hint to seed a new event manually.
      if (
        payload.fileType === 'text/calendar' ||
        payload.fileName.toLowerCase().endsWith('.ics')
      ) {
        // The file itself isn't on the URL; tell the user to drop it
        // on the calendar import screen. (A future revision can park
        // the file in IndexedDB during the share flow and pick it up
        // here, but v1 stays simple.)
        return `/calendar?import-ics=1`;
      }
      const titleHint = payload.title || payload.text || '';
      return titleHint
        ? `/calendar?suggested-title=${encodeURIComponent(titleHint.slice(0, 200))}`
        : `/calendar`;
    }

    case 'task': {
      const taskTitle =
        payload.title ||
        (payload.url ? prettyHostname(payload.url) : '') ||
        (payload.text ? payload.text.slice(0, 80) : '');
      const params = new URLSearchParams({ action: 'new' });
      if (taskTitle) params.set('title', taskTitle);
      if (payload.url) params.set('url', payload.url);
      if (payload.text && payload.text !== taskTitle) {
        params.set('description', payload.text.slice(0, 1000));
      }
      return `/tasks?${params.toString()}`;
    }

    case 'unknown':
    default:
      return '/dashboard';
  }
}

function prettyHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return rawUrl.slice(0, 80);
  }
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
