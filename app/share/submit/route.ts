/**
 * POST handler for the PWA Web Share Target.
 *
 * The browser/OS calls this endpoint when a user picks "Share to Rowan"
 * from the system share sheet. We accept multipart/form-data per the
 * manifest.json `share_target` definition, then redirect to the
 * /share landing page (a UI component) with the shared content
 * encoded as URL params.
 *
 * Why redirect instead of routing here directly:
 * - The browser invokes this with a cross-site POST; SameSite cookies
 *   may not be present, so we can't trust auth at this stage.
 * - The /share page is auth-gated (sits inside the protected app)
 *   and can render a confirmation UI before any DB write.
 * - Redirect preserves the standalone PWA window context.
 *
 * For files (.ics calendar, images), we don't try to handle them
 * inline — we stash a flag and let the destination page handle the
 * upload via its existing endpoint. For .ics specifically, the user
 * lands on /share?destination=calendar with file metadata, picks
 * "Add to Calendar", and the page POSTs the file to
 * /api/calendar/import/ics-file from the authenticated context.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let title: string | null = null;
  let text: string | null = null;
  let url: string | null = null;
  let fileName: string | null = null;
  let fileType: string | null = null;
  let fileSize: number | null = null;

  try {
    const formData = await req.formData();
    title = (formData.get('title') as string | null) ?? null;
    text = (formData.get('text') as string | null) ?? null;
    url = (formData.get('url') as string | null) ?? null;

    const file = formData.get('file');
    if (file instanceof File && file.size > 0) {
      fileName = file.name;
      fileType = file.type;
      fileSize = file.size;
    }
  } catch {
    // Some browsers send GET-style sharing as well; we tolerate by
    // falling back to query-param parsing on the redirect.
    const qs = req.nextUrl.searchParams;
    title = qs.get('title');
    text = qs.get('text');
    url = qs.get('url');
  }

  const params = new URLSearchParams();
  if (title) params.set('title', title.slice(0, 500));
  if (text) params.set('text', text.slice(0, 2000));
  if (url) params.set('url', url.slice(0, 2000));
  if (fileName) params.set('fileName', fileName.slice(0, 200));
  if (fileType) params.set('fileType', fileType);
  if (fileSize !== null) params.set('fileSize', String(fileSize));

  // Pre-route hint computed server-side (the page also runs this
  // logic for client-only navigation, but having it on the URL
  // means /share?destination=recipe loads with the right intent
  // already chosen).
  const destination = decideDestination({ url, text, title, fileName, fileType });
  params.set('destination', destination);

  return NextResponse.redirect(
    new URL(`/share?${params.toString()}`, req.nextUrl.origin),
    { status: 303 } // 303 forces the browser to GET the redirect target
  );
}

// GET fallback: some browsers send shares as GET when there are no files.
// We treat it identically by parsing query params and redirecting.
export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams;
  const title = qs.get('title');
  const text = qs.get('text');
  const url = qs.get('url');

  const params = new URLSearchParams();
  if (title) params.set('title', title.slice(0, 500));
  if (text) params.set('text', text.slice(0, 2000));
  if (url) params.set('url', url.slice(0, 2000));

  const destination = decideDestination({ url, text, title, fileName: null, fileType: null });
  params.set('destination', destination);

  return NextResponse.redirect(
    new URL(`/share?${params.toString()}`, req.nextUrl.origin),
    { status: 303 }
  );
}

type Destination = 'recipe' | 'calendar' | 'task' | 'unknown';

interface DecideInput {
  url: string | null;
  text: string | null;
  title: string | null;
  fileName: string | null;
  fileType: string | null;
}

const RECIPE_DOMAINS = [
  'allrecipes.com',
  'foodnetwork.com',
  'seriouseats.com',
  'food.com',
  'epicurious.com',
  'bonappetit.com',
  'cooking.nytimes.com',
  'simplyrecipes.com',
  'tasteofhome.com',
  'budgetbytes.com',
  'kingarthurbaking.com',
  'minimalistbaker.com',
  'eatingwell.com',
  'delish.com',
  'food52.com',
  'thekitchn.com',
  'smittenkitchen.com',
  'cookieandkate.com',
  'pinchofyum.com',
];

function decideDestination(input: DecideInput): Destination {
  // 1. .ics file or text/calendar MIME → calendar
  if (
    input.fileType === 'text/calendar' ||
    input.fileName?.toLowerCase().endsWith('.ics') ||
    input.url?.toLowerCase().endsWith('.ics')
  ) {
    return 'calendar';
  }

  // 2. Recipe domain detection
  if (input.url) {
    try {
      const hostname = new URL(input.url).hostname.replace(/^www\./, '').toLowerCase();
      if (RECIPE_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
        return 'recipe';
      }
      // Generic recipe path heuristic
      if (/\/recipe[s]?\//i.test(input.url)) {
        return 'recipe';
      }
    } catch {
      // bad URL — fall through
    }
  }

  // 3. Anything with a URL or text becomes a task by default.
  // The /share page lets the user override.
  if (input.url || input.text || input.title) {
    return 'task';
  }

  return 'unknown';
}
