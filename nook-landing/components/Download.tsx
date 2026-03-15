export function Download() {
  return (
    <section id="download" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Download Nook
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Get started with the latest version of Nook for macOS.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button className="bg-black text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
            Download for macOS
          </button>
          <div className="text-sm text-gray-500">
            Version 0.1.0 • Requires macOS 10.15 or later
          </div>
        </div>
        
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="bg-gray-50 rounded-lg p-6 text-left">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">System Requirements</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• macOS 10.15 (Catalina) or later</li>
              <li>• 4GB RAM minimum</li>
              <li>• 100MB free disk space for installation</li>
              <li>• Apple Silicon or Intel processor</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
