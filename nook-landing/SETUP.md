# Nook Landing Page Setup

This document explains how to set up the complete payment and licensing flow for Nook.

## Database Setup

1. **Set up Neon PostgreSQL database**
   - Create a new Neon project
   - Get the connection string
   - Update `.env.local` with your database URL

2. **Environment Variables**

   ```env
   DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
   DODO_WEBHOOK_SECRET="your-dodo-webhook-secret"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

3. **Run Database Migrations**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

## Payment Flow

### User Journey

1. **Pricing Page** (`/pricing`)
   - User chooses between Free Trial or Pro ($29)
   - Selects Mac model (Apple Silicon or Intel)
   - Enters name and email with validation

2. **Free Trial Flow**
   - User gets redirected to `/download` with user data
   - Automatic registration in database
   - Download of Nook.dmg
   - 7-day trial period in the app

3. **Paid Flow**
   - User gets redirected to payment processing
   - Dodo payment integration ($5 one-time)
   - Webhook confirms payment
   - License key generated and stored
   - User receives license key via email

### API Endpoints

- `POST /api/users` - Register new users
- `POST /api/payment/create` - Create payment session
- `POST /api/payment/webhook` - Handle Dodo webhooks
- `POST /api/license/validate` - Validate license keys

## Tauri App Integration

### License Key Validation

The Tauri app validates license keys by calling:

```
POST https://nook-landing.vercel.app/api/license/validate
```

### Settings Page

The settings page (`/src/pages/Settings.tsx`) includes:

- License key input field
- Real-time validation
- Purchase link to pricing page
- License status display

## Database Schema

### Users Table

- `id` - UUID primary key
- `name` - User's full name
- `email` - Unique email address
- `model` - 'apple-silicon' or 'intel'
- `plan` - 'free' or 'paid'
- `licenseKey` - Foreign key to licenses
- `isActive` - Boolean status
- `createdAt` / `updatedAt` - Timestamps

### Licenses Table

- `id` - UUID primary key
- `userId` - Foreign key to users
- `key` - Unique license key
- `isValid` - Boolean validation status
- `expiresAt` - Expiration timestamp
- `createdAt` - Creation timestamp

## Development

### Running Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables in `.env.local`

3. Run database migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

### Database Management

- View database: `npm run db:studio`
- Generate migrations: `npm run db:generate`
- Apply migrations: `npm run db:migrate`

## Security Considerations

- All license keys are cryptographically generated
- Webhook signatures are verified
- Database connections use SSL
- Input validation on all user data
- Rate limiting recommended for production

## Testing the Flow

1. Visit `/pricing` and select Free Trial
2. Fill out the form and submit
3. Verify user creation in database
4. Download and test the app with trial
5. Upgrade to Pro and test license activation

## Production Deployment

1. Deploy to Vercel or similar platform
2. Set production environment variables
3. Configure Dodo payment webhooks
4. Set up custom domain
5. Enable SSL certificates
6. Test end-to-end flow
