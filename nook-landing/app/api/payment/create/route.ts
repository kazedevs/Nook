import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import DodoPayments from 'dodopayments'

const schema = z.object({
  name:  z.string().min(2),
  email: z.string().email(),
  model: z.enum(['apple-silicon', 'intel']),
})

const dodo = new DodoPayments({
  bearerToken:  process.env.DODO_API_KEY!,
  environment:  process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await dodo.checkoutSessions.create({
      product_cart:  [{ product_id: process.env.DODO_PRODUCT_ID!, quantity: 1 }],
      customer:      { email: data.email, name: data.name },
      return_url:    `${base}/return?model=${data.model}`,
      metadata:      { model: data.model },
    })

    return NextResponse.json({
      url:   session.checkout_url,
      model: data.model,
    })
  } catch (err) {
    console.error('payment/create:', err)
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
}