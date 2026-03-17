import Link from 'next/link'
import { RiArrowLeftLine, RiFileTextLine } from 'react-icons/ri'

export default function Terms() {
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
            <RiFileTextLine size={24} className="text-n-green-text" />
            <h1 className="text-4xl font-bold tracking-tight font-inter">Terms of Service</h1>
          </div>
          <p className="text-lg text-n-muted font-[system-ui] font-light leading-relaxed">
            Terms and conditions for using Nook disk utility software.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Acceptance of Terms</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              By downloading, installing, or using Nook ("the Software"), you agree to be bound by these 
              Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Software.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">License</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              Nook is licensed to you on a subscription basis. This license grants you the right to use 
              the Software on devices you own or control, in accordance with these Terms.
            </p>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              The license is non-exclusive, non-transferable, and revocable. You may not sublicense, rent, 
              lease, or distribute the Software to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Free Trial</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              Nook offers a 7-day free trial with full functionality. No payment method is required to start the trial.
            </p>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              After the trial period, you must purchase a subscription to continue using the Software. 
              Trial data and settings are preserved when you subscribe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Subscription and Payment</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              Subscriptions are charged on a recurring basis (monthly or annually) until cancelled. 
              Prices are subject to change with 30 days notice.
            </p>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. 
              No refunds are provided for partial subscription periods.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Permitted Uses</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              You may use Nook to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-n-muted font-[system-ui] font-light">
              <li>Analyze and clean files on your personal Mac computers</li>
              <li>Use the Software for both personal and commercial purposes</li>
              <li>Install on multiple Mac computers you own or control</li>
              <li>Create backups of your files before deletion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Restrictions</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              You may not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-n-muted font-[system-ui] font-light">
              <li>Reverse engineer, decompile, or attempt to extract the source code</li>
              <li>Modify, adapt, or create derivative works</li>
              <li>Remove or alter any copyright notices or licensing information</li>
              <li>Use the Software for illegal or unauthorized purposes</li>
              <li>Bypass or circumvent any license or security mechanisms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">File Operations and Disclaimer</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              Nook helps you identify and remove files from your Mac. However, the final decision to delete files 
              is always yours.
            </p>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              We recommend backing up important files before using the Software. The creators of Nook are not 
              responsible for data loss or damage resulting from use of the Software.
            </p>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              The Software is provided "as is" without warranties of any kind, either express or implied.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Privacy</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              Nook operates entirely locally on your device. We do not collect, upload, or analyze your files or usage data. 
              Our complete privacy policy is available at <Link href="/privacy" className="text-n-green-text hover:text-n-green-text/80 transition-colors">nookapp.com/privacy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Intellectual Property</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              Nook and all related intellectual property rights are owned by us. These Terms do not grant you any 
              rights to our trademarks, service marks, or other intellectual property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Termination</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              We may terminate your license and access to the Software if you violate these Terms. 
              Upon termination, you must cease using the Software and uninstall it from your devices.
            </p>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              Your right to use the Software ends immediately upon termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Limitation of Liability</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              To the maximum extent permitted by law, Nook shall not be liable for any indirect, incidental, 
              special, or consequential damages resulting from your use of the Software.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Governing Law</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              These Terms are governed by and construed in accordance with applicable laws. 
              Any disputes will be resolved through binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Changes to Terms</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed">
              We may update these Terms from time to time. Continued use of the Software after changes 
              constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 font-inter">Contact</h2>
            <p className="text-n-muted font-[system-ui] font-light leading-relaxed mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <p className="text-n-muted font-[system-ui] font-light">
              Email: <a href="mailto:legal@nookapp.com" className="text-n-green-text hover:text-n-green-text/80 transition-colors">legal@nookapp.com</a>
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
