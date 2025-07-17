import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
      {/* Logo & main navigation */}
      <div className="flex items-center gap-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {/* AI Builder icon */}
          <span className="inline-block w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500" />
          AI App Builder
        </Link>
      </div>
    </nav>
  );
}