import Link from 'next/link'
import { RiArrowLeftLine } from 'react-icons/ri'

export default function About() {
  return (
    <div className="min-h-screen bg-black text-n-text">
      <div className="max-w-3xl mx-auto px-6 py-20">
        {/* Back button */}
        <Link href="/" className="inline-flex items-center gap-2 text-n-muted hover:text-n-text transition-colors mb-12">
          <RiArrowLeftLine size={16} />
          <span className="text-sm font-[system-ui] font-light">Back to home</span>
        </Link>

        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4 font-inter">About Nook</h1>
          <p className="text-lg text-n-muted font-[system-ui] font-light leading-relaxed">
            The smartest way to clean your Mac. Built by developers, for developers.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Our Mission</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              Nook was born from a simple frustration: Mac storage management is unnecessarily complicated. 
              We believe cleaning your Mac should be fast, safe, and straightforward. No complex interfaces, 
              no confusing options—just powerful tools that work.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Built for Developers</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              As developers ourselves, we understand the pain of accumulated node_modules, Xcode caches, 
              and development artifacts. Nook is specifically designed to handle dev junk efficiently, 
              helping you reclaim gigabytes of space without touching your active projects.
            </p>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              Every feature in Nook is crafted with the developer workflow in mind—from parallel scanning 
              algorithms to smart duplicate detection that respects your project structure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Privacy First</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              Unlike other disk utilities, Nook runs entirely locally on your Mac. We never collect, 
              upload, or analyze your data. Your files stay on your device, period. This isn't just a 
              feature—it's our core principle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">The Team</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              Nook is built by a small team of Mac enthusiasts and developers who care deeply about 
              user privacy and software quality. We're obsessed with making tools that are powerful, 
              beautiful, and respectful of your time and data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Contact</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              Have questions, feedback, or ideas? We'd love to hear from you.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-n-muted font-[system-ui] font-light">
                Twitter: <a href="https://twitter.com/fiynraj" className="text-n-green-text hover:text-n-green-text/80 transition-colors">@fiynraj</a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
