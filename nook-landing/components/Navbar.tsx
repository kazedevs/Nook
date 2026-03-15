'use client'

import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Nook
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </Link>
            <Link href="#download" className="text-gray-600 hover:text-gray-900 transition-colors">
              Download
            </Link>
            <Link href="/api/webhook" className="text-gray-600 hover:text-gray-900 transition-colors">
              API
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link 
              href="/return" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Return
            </Link>
            <Link 
              href="#download"
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
