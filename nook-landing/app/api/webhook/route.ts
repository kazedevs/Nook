import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Dodo webhook processing logic
    console.log('Received dodo webhook:', body)
    
    // Validate webhook signature if needed
    const signature = request.headers.get('x-dodo-signature')
    if (signature) {
      // Verify signature logic here
      console.log('Webhook signature:', signature)
    }
    
    // Process different event types
    const eventType = body.type || body.event
    
    switch (eventType) {
      case 'user.created':
        console.log('New user created:', body.data)
        break
      case 'payment.completed':
        console.log('Payment completed:', body.data)
        break
      case 'subscription.updated':
        console.log('Subscription updated:', body.data)
        break
      default:
        console.log('Unknown event type:', eventType)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      received: body 
    })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Dodo webhook endpoint',
    status: 'active',
    timestamp: new Date().toISOString()
  })
}
