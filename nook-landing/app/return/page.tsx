import Link from 'next/link'

export default function ReturnPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Return Policy
          </h1>
          
          <div className="text-left bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Our Guarantee</h2>
            <p className="text-gray-600 mb-4">
              We stand behind Nook 100%. If you're not satisfied with your purchase, we offer a 30-day money-back guarantee.
            </p>
            
            <h3 className="text-md font-semibold text-gray-900 mb-2">How to Request a Return</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
              <li>Contact our support team at support@nook.app</li>
              <li>Include your order number and reason for return</li>
              <li>We'll process your request within 2 business days</li>
              <li>Refunds will be issued to the original payment method</li>
            </ol>
            
            <h3 className="text-md font-semibold text-gray-900 mb-2 mt-4">Refund Conditions</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
              <li>Requests must be made within 30 days of purchase</li>
              <li>Product must not have been used extensively</li>
              <li>Valid proof of purchase required</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <Link 
              href="mailto:support@nook.app"
              className="block w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Contact Support
            </Link>
            <Link 
              href="/"
              className="block w-full border border-gray-300 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
