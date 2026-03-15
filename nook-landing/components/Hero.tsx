import Link from 'next/link'

export function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
          Clean Your Mac
          <br />
          <span className="text-gray-600">The Simple Way</span>
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          A lightweight desktop utility for macOS that helps you quickly see what's taking up space on your computer and clean it easily.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="#download"
            className="bg-black text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Download Now
          </Link>
          <Link 
            href="#features"
            className="border border-gray-300 text-gray-900 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  )
}
