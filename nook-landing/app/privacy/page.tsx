import Link from 'next/link'
import { RiArrowLeftLine, RiShieldLine, RiLockLine, RiEyeOffLine } from 'react-icons/ri'

export default function Privacy() {
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
          <div className="flex items-center gap-3 mb-4">
            <RiShieldLine size={24} className="text-n-green-text" />
            <h1 className="text-4xl font-bold tracking-tight font-inter">Privacy Policy</h1>
          </div>
          <p className="text-lg text-n-muted font-[system-ui] font-light leading-relaxed">
            Your privacy is our priority. Nook operates entirely on your device.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Local Processing Only</h2>
            <div className="flex items-start gap-3 mb-4">
              <RiLockLine size={20} className="text-n-green-text shrink-0 mt-1" />
              <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
                Nook runs entirely locally on your Mac. We never upload, collect, or transmit any of your files, 
                data, or usage information to our servers or any third parties.
              </p>
            </div>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              All scanning, analysis, and file operations happen on your device. Your files never leave your Mac.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">No Data Collection</h2>
            <div className="flex items-start gap-3 mb-4">
              <RiEyeOffLine size={20} className="text-n-green-text shrink-0 mt-1" />
              <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
                We don't collect analytics, usage statistics, crash reports, or any other data about how you use Nook.
              </p>
            </div>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              No telemetry, no tracking, no user profiling. Nook doesn't even know you're using it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">No Third-Party Services</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              Nook doesn't integrate with any third-party analytics, advertising, or tracking services. 
              We don't use cookies, local storage for tracking, or any other tracking mechanisms.
            </p>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              The app doesn't make network requests except for license verification (if applicable) and 
              update checks, both of which are minimal and don't transmit personal data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">File Safety</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              Nook only analyzes file metadata (size, type, location) to identify potential space-wasting files. 
              We don't examine file contents except when specifically requested for duplicate detection.
            </p>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              All file operations require explicit user confirmation. Nook never deletes files without your permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">License Verification</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              If license verification is required, it only transmits minimal, anonymous license information 
              to verify authenticity. No personal data or usage information is shared.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Data Retention</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              Since we don't collect any data, there's nothing to retain. Nook doesn't store user data 
              on our servers or maintain user profiles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Children's Privacy</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              Nook is not directed to children under 13. Since we don't collect any personal information, 
              this policy applies equally to all users regardless of age.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Changes to This Policy</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              If we ever change our privacy practices, we'll update this policy and notify users through 
              app updates. Our commitment to privacy and local processing will never change.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Contact</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              If you have questions about this privacy policy or Nook's privacy practices, please contact us:
            </p>
            <p className="text-n-muted font-[system-ui] font-light">
              Email: <a href="mailto:privacy@nookapp.com" className="text-n-green-text hover:text-n-green-text/80 transition-colors">privacy@nookapp.com</a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-n-border">
          <p className="text-xs text-n-dim font-[system-ui] font-light">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}
