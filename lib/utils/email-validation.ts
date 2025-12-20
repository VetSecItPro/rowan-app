/**
 * Email validation utilities
 * Includes disposable/temporary email domain blocklist
 */

// Comprehensive list of disposable/temporary email domains
// These are commonly used for spam, abuse, or bypassing verification
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Major disposable email services
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.org',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'tempmail.net',
  'guerrillamail.com',
  'guerrillamail.org',
  'guerrillamail.net',
  'guerrillamail.biz',
  'guerrillamail.de',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  'mailinator.com',
  'mailinator.net',
  'mailinator.org',
  'mailinator2.com',
  'mailinater.com',
  'throwaway.email',
  'throwawaymail.com',
  'getairmail.com',
  'getnada.com',
  'nada.email',
  'tempail.com',
  'tempr.email',
  'discard.email',
  'discardmail.com',
  'disposablemail.com',
  'disposable.com',
  'fakeinbox.com',
  'fakemailgenerator.com',
  'mailcatch.com',
  'mailnesia.com',
  'mailsac.com',
  'maildrop.cc',
  'mintemail.com',
  'mohmal.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.org',
  'trashmail.me',
  'trashemail.de',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'emailondeck.com',
  'anonymbox.com',
  'spamgourmet.com',
  'spamgourmet.net',
  'spamgourmet.org',
  'spamex.com',
  'spamfree24.org',
  'spamfree24.de',
  'spamfree24.eu',
  'spamfree24.info',
  'spamfree24.net',
  'burnermail.io',
  'burnermailprovider.com',
  'emailfake.com',
  'emkei.cz',
  'fakemailgenerator.net',
  'fakemail.net',
  'mailtemp.net',
  'tempmailo.com',
  'tempmailaddress.com',
  'tempmails.net',
  'tmpmail.net',
  'tmpmail.org',
  'mailnull.com',
  'e4ward.com',
  'spamcero.com',
  'objectmail.com',
  'proxymail.eu',
  'rcpt.at',
  'trash-mail.at',
  'trash-mail.com',
  'trash-mail.de',
  'trashbox.eu',
  'trbvm.com',
  'trbvn.com',
  'tmail.ws',
  'uggsrock.com',
  'veryrealemail.com',
  'viditag.com',
  'viewcastmedia.com',
  'viewcastmedia.net',
  'viewcastmedia.org',
  'webuser.in',
  'wegwerfemail.de',
  'wh4f.org',
  'whyspam.me',
  'willhackforfood.biz',
  'willselfdestruct.com',
  'winemaven.info',
  'wronghead.com',
  'wuzup.net',
  'wuzupmail.net',
  'wwwnew.eu',
  'xagloo.com',
  'xemaps.com',
  'xents.com',
  'xmaily.com',
  'xoxy.net',
  'yapped.net',
  'yep.it',
  'yogamaven.com',
  'yuurok.com',
  'zehnminutenmail.de',
  'zippymail.info',
  'zoaxe.com',
  'zoemail.org',
  // Additional common ones
  'mailforspam.com',
  'sogetthis.com',
  'spambox.us',
  'spamherelots.com',
  'spamhereplease.com',
  'spamhole.com',
  'spamify.com',
  'spaml.com',
  'spaml.de',
  'spamoff.de',
  'spamslicer.com',
  'spamspot.com',
  'spamthis.co.uk',
  'spamtroll.net',
  'superrito.com',
  'superstachel.de',
  'suremail.info',
  'teleworm.com',
  'teleworm.us',
  'tempinbox.com',
  'tempinbox.co.uk',
  'tempomail.fr',
  'temporaryemail.net',
  'temporaryemail.us',
  'temporaryforwarding.com',
  'temporaryinbox.com',
  'thankyou2010.com',
  'thisisnotmyrealemail.com',
  'throam.com',
  'throwam.com',
  'tittbit.in',
  'tmailinator.com',
  'toiea.com',
  'tokenmail.de',
  'toomail.biz',
  'topranklist.de',
  'tradermail.info',
  'turual.com',
  'twinmail.de',
  'tyldd.com',
  'ubismail.net',
  'upliftnow.com',
  'uplipht.com',
  'uroid.com',
  'us.af',
  'vkcode.ru',
  'vomoto.com',
  'vpn.st',
  'vsimcard.com',
  'vztc.com',
  'w3internet.co.uk',
  'walkmail.net',
  'webemail.me',
  'webm4il.info',
  'wegwerfadresse.de',
  'wegwerfemail.com',
  'wetrainbayarea.com',
  'wetrainbayarea.org',
  // Russian disposable domains
  'dropmail.me',
  'mailbox.in.ua',
  'crazymailing.com',
  'inboxalias.com',
  // More recent ones
  'gmailnator.com',
  'emailnator.com',
  'tempemailfree.com',
  'luxusmail.org',
  'tmail.com',
  'emailtemporar.ro',
  'emailtemporaire.com',
  'emailtemporaire.fr',
  'fakemail.fr',
  'jetable.org',
  'mail-temporaire.fr',
  'mailtemporaire.com',
  'mailtemporaire.fr',
  'poubelle.email',
  'spambox.info',
  '33mail.com',
  'anonaddy.com',
  'simplelogin.co',
  'simplelogin.com',
  'simplelogin.fr',
  'duck.com', // DuckDuckGo email protection - might want to allow this
  'relay.firefox.com',
  'mozmail.com',
]);

// Allowed email providers (major legitimate providers)
const ALLOWED_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.es',
  'yahoo.it',
  'yahoo.ca',
  'yahoo.com.au',
  'yahoo.co.in',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'pm.me',
  'zoho.com',
  'zohomail.com',
  'mail.com',
  'email.com',
  'usa.com',
  'consultant.com',
  'engineer.com',
  'doctor.com',
  'musician.org',
  'yandex.com',
  'yandex.ru',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'gmx.at',
  'gmx.ch',
  'web.de',
  'fastmail.com',
  'fastmail.fm',
  'tutanota.com',
  'tutanota.de',
  'tuta.io',
  'hey.com',
  'att.net',
  'sbcglobal.net',
  'bellsouth.net',
  'comcast.net',
  'verizon.net',
  'cox.net',
  'charter.net',
  'earthlink.net',
  'optonline.net',
  'frontier.com',
  'windstream.net',
  'rocketmail.com',
]);

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  isDisposable?: boolean;
  domain?: string;
}

/**
 * Validate an email address
 * Checks format, disposable domains, and optionally enforces allowed providers
 */
export function validateEmail(
  email: string,
  options: {
    allowAnyDomain?: boolean; // If false, only allow known providers
    blockDisposable?: boolean; // Block disposable/temp email domains
  } = { allowAnyDomain: true, blockDisposable: true }
): EmailValidationResult {
  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }

  // Extract domain
  const domain = normalizedEmail.split('@')[1];

  // Check for disposable domains
  if (options.blockDisposable !== false) {
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      return {
        isValid: false,
        error: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
        isDisposable: true,
        domain,
      };
    }

    // Check for subdomains of disposable domains
    const domainParts = domain.split('.');
    for (let i = 1; i < domainParts.length; i++) {
      const parentDomain = domainParts.slice(i).join('.');
      if (DISPOSABLE_EMAIL_DOMAINS.has(parentDomain)) {
        return {
          isValid: false,
          error: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
          isDisposable: true,
          domain,
        };
      }
    }
  }

  // Optionally enforce allowed providers only
  if (options.allowAnyDomain === false) {
    if (!ALLOWED_PROVIDERS.has(domain)) {
      return {
        isValid: false,
        error: 'Please use an email from a major provider (Gmail, Outlook, Yahoo, iCloud, etc.)',
        domain,
      };
    }
  }

  return {
    isValid: true,
    domain,
  };
}

/**
 * Check if a domain is disposable
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().trim().split('@')[1];
  if (!domain) return false;

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return true;
  }

  // Check subdomains
  const domainParts = domain.split('.');
  for (let i = 1; i < domainParts.length; i++) {
    const parentDomain = domainParts.slice(i).join('.');
    if (DISPOSABLE_EMAIL_DOMAINS.has(parentDomain)) {
      return true;
    }
  }

  return false;
}

/**
 * Get the list of disposable domains (for admin viewing)
 */
export function getDisposableDomainCount(): number {
  return DISPOSABLE_EMAIL_DOMAINS.size;
}
