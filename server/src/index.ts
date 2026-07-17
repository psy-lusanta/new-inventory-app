import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.routes'
import tableRoutes from './routes/table.routes'
import rowRoutes from './routes/row.routes'
import reportRoutes from './routes/report.routes'
import pafRoutes from './routes/paf.routes'
import logRoutes from './routes/log.routes'

dotenv.config()

// ─── Validate required env vars ───────────────────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'PORT']
const missing = REQUIRED_ENV.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 3000
const isDev = process.env.NODE_ENV !== 'production'

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // disabled until configured properly
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL]
  : ['http://localhost:5173', 'http://localhost:3000']

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, Thunder Client)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`))
    }
  },
  credentials: true,
}))

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Global limiter — generous in dev, strict in prod
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
})

// Auth limiter — ONLY for login endpoint
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 10, // very relaxed in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts, please try again in 15 minutes' },
  skipSuccessfulRequests: true, // don't count successful logins against limit
})

app.use('/api', globalLimiter)
app.use('/api/auth/login', authLimiter) // only login endpoint gets strict limit

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/tables', tableRoutes)
app.use('/api/tables/:tableId/rows', rowRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/paf', pafRoutes)
app.use('/api/logs', logRoutes)

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  })
})

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`Security headers enabled`)
  console.log(`Rate limiting: ${isDev ? 'relaxed (dev)' : 'strict (prod)'}`)
})