export function Features() {
  const features = [
    {
      title: "Disk Space Analysis",
      description: "Quickly see what's taking up space on your Mac with intuitive visualizations."
    },
    {
      title: "Smart Cleaning",
      description: "Safely remove unnecessary files and reclaim valuable storage space."
    },
    {
      title: "Lightweight & Fast",
      description: "Built for performance with minimal resource usage and blazing fast scans."
    },
    {
      title: "Privacy First",
      description: "Your data stays on your device. No uploads, no tracking, just local processing."
    }
  ]

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Powerful Features
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to keep your Mac clean and running smoothly.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-white rounded"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
