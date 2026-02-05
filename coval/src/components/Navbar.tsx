'use client';

import Link from 'next/link';
import { withBasePath } from '@/lib/basePath';

export default function Navbar() {
  return (
    <nav className="sticky top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10">
      {/* Logo & main navigation */}
      <div className="flex items-center gap-10">
        <Link
          href={withBasePath("/")}
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
          <img src="/blaxel-logo.png" alt="Blaxel" className="h-6" />
          <span className="text-white/40 text-sm font-medium">App Generator</span>
        </Link>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <a
          href="https://docs.blaxel.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Docs
        </a>
        <a
          href="https://app.blaxel.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
        >
          Get Started
        </a>
      </div>
    </nav>
  );
}
