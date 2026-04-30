'use client';

import Image from 'next/image';
import Link from 'next/link';

/**
 * Branding panels for the signup screen — extracted so signup/page.tsx stays
 * focused on the form. Renders the mobile header and the desktop left rail.
 */
export function MobileBrandHeader({ mounted }: { mounted: boolean }) {
  return (
    <div
      className={`lg:hidden bg-black pt-8 pb-12 px-4 transform transition-all duration-700 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <Link href="/" className="flex flex-col items-center group">
        <Image
          src="/rowan-logo.png"
          alt="Rowan Logo"
          width={72}
          height={72}
          className="w-18 h-18 drop-shadow-2xl group-hover:scale-105 transition-transform duration-200"
        />
        <span className="mt-2 text-2xl font-bold text-white drop-shadow-lg">Rowan</span>
      </Link>
    </div>
  );
}

export function DesktopBrandPanel({ mounted }: { mounted: boolean }) {
  return (
    <div
      className={`hidden lg:flex lg:w-1/2 bg-black flex-col items-center justify-center p-12 relative overflow-hidden transform transition-all duration-700 ${
        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
    >
      <div className="relative z-10 text-center">
        <Link href="/" className="flex items-center justify-center gap-4 mb-8 group">
          <Image
            src="/rowan-logo.png"
            alt="Rowan Logo"
            width={120}
            height={120}
            className="w-28 h-28 drop-shadow-2xl group-hover:scale-105 transition-transform duration-200"
          />
          <h1 className="text-6xl xl:text-7xl font-bold text-white drop-shadow-lg group-hover:scale-105 transition-transform duration-200">
            Rowan
          </h1>
        </Link>
        <p className="text-lg xl:text-xl text-emerald-200 mb-8 text-center px-4">
          Collaborative life management for couples and families
        </p>
        <div className="space-y-4 text-lg text-emerald-200 max-w-md mx-auto">
          <p className="flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-300 rounded-full flex-shrink-0"></span>
            Shared calendars &amp; task management
          </p>
          <p className="flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-300 rounded-full flex-shrink-0"></span>
            Shopping lists &amp; meal planning
          </p>
          <p className="flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-300 rounded-full flex-shrink-0"></span>
            Goal tracking &amp; household management
          </p>
        </div>
      </div>
    </div>
  );
}
