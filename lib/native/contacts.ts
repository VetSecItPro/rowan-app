/**
 * Contacts Native Bridge
 *
 * Wraps @capacitor-community/contacts for accessing the device contact list
 * on iOS/Android. Returns null or empty arrays on web (no equivalent API).
 */

import { isNative, isPluginAvailable } from './capacitor';

// Types from the plugin
type ContactsPlugin = typeof import('@capacitor-community/contacts').Contacts;

// Dynamic import to avoid bundling issues on web
let ContactsPlugin: ContactsPlugin | null = null;

async function getContactsPlugin(): Promise<ContactsPlugin | null> {
  if (!isNative) return null;

  if (!ContactsPlugin) {
    const mod = await import('@capacitor-community/contacts');
    ContactsPlugin = mod.Contacts;
  }
  return ContactsPlugin;
}

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Check if contacts access is available on this platform
 *
 * Returns true only on native platforms with the Contacts plugin registered.
 * There is no web equivalent for contacts access.
 */
export function isContactsAvailable(): boolean {
  if (isNative) {
    return isPluginAvailable('Contacts');
  }
  return false;
}

/**
 * Pick a single contact from the device contact list
 *
 * Opens the native contact picker UI. Returns the selected contact's
 * name, email, and phone number if available.
 *
 * @returns The selected contact, or null if cancelled or unavailable.
 */
export async function pickContact(): Promise<ContactInfo | null> {
  const plugin = await getContactsPlugin();
  if (!plugin) return null;

  try {
    const result = await plugin.pickContact({
      projection: {
        name: true,
        phones: true,
        emails: true,
      },
    });

    const contact = result.contact;
    if (!contact) return null;

    return {
      name: contact.name?.display ?? undefined,
      email: contact.emails?.[0]?.address ?? undefined,
      phone: contact.phones?.[0]?.number ?? undefined,
    };
  } catch {
    // User cancelled or plugin error
    return null;
  }
}

/**
 * Get contacts from the device
 *
 * Retrieves a list of contacts, optionally filtered by a search string.
 * The filter is applied client-side against the contact's display name.
 *
 * @returns Array of contacts with name, email, and phone fields.
 */
export async function getContacts(
  options?: { filter?: string }
): Promise<ContactInfo[]> {
  const plugin = await getContactsPlugin();
  if (!plugin) return [];

  try {
    const result = await plugin.getContacts({
      projection: {
        name: true,
        phones: true,
        emails: true,
      },
    });

    let contacts = result.contacts.map((contact) => ({
      name: contact.name?.display ?? undefined,
      email: contact.emails?.[0]?.address ?? undefined,
      phone: contact.phones?.[0]?.number ?? undefined,
    }));

    // Client-side filtering by name
    if (options?.filter) {
      const filterLower = options.filter.toLowerCase();
      contacts = contacts.filter(
        (c) => c.name && c.name.toLowerCase().includes(filterLower)
      );
    }

    return contacts;
  } catch {
    // Permission denied or plugin error
    return [];
  }
}
