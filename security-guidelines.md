# Security Implementation Guidelines
## React + Node.js Full-Stack Project

> **Scope:** This document outlines security best practices and implementation guidelines for a full-stack application built with React (frontend) and Node.js (backend). It is intended to guide AI-assisted development using tools like GitHub Copilot or Claude.

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Input Validation & Sanitization](#2-input-validation--sanitization)
3. [API Security](#3-api-security)
4. [Data Security & Storage](#4-data-security--storage)
5. [Frontend Security (React)](#5-frontend-security-react)
6. [Dependency Management](#6-dependency-management)
7. [Environment & Configuration](#7-environment--configuration)
8. [Logging & Monitoring](#8-logging--monitoring)
9. [Error Handling](#9-error-handling)
10. [Infrastructure & Deployment](#10-infrastructure--deployment)
11. [Security Headers Checklist](#11-security-headers-checklist)
12. [AI-Assisted Development Notes](#12-ai-assisted-development-notes)

---

## 1. Authentication & Authorization

### 1.1 JWT Tokens

- Use short-lived **access tokens** (15 minutes) and longer-lived **refresh tokens** (7 days).
- Store access tokens **in memory** (React state), never in `localStorage`.
- Store refresh tokens in **`HttpOnly`, `Secure`, `SameSite=Strict`** cookies.
- Sign JWTs with **RS256** (asymmetric) over HS256 wherever possible.
- Always verify `iss`, `aud`, and `exp` claims on the server side.

```js
// Node.js — token verification example
const jwt = require('jsonwebtoken');

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  });
}
```

### 1.2 Password Handling

- Hash passwords with **bcrypt** (cost factor ≥ 12) or **Argon2id**.
- Never log, return, or store plaintext passwords anywhere in the stack.
- Enforce a minimum password strength policy (length ≥ 12, mixed character types).
- Implement account lockout after **5 consecutive failed** login attempts.

```js
// Node.js — password hashing
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
const isValid = await bcrypt.compare(plainPassword, hash);
```

### 1.3 Role-Based Access Control (RBAC)

- Define roles and permissions at the **server level** — never trust the frontend for access decisions.
- Use middleware to enforce role checks on every protected route.
- Follow the **principle of least privilege**: grant only the permissions a user strictly needs.

```js
// Express middleware — RBAC example
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

router.delete('/admin/users/:id', authenticate, requireRole('admin'), deleteUser);
```

### 1.4 Multi-Factor Authentication (MFA)

- Offer TOTP-based MFA (e.g., Google Authenticator) using a library like `speakeasy`.
- Require MFA for all admin and privileged accounts.
- Implement backup codes that are **hashed** before storage.

---

## 2. Input Validation & Sanitization

### 2.1 Server-Side Validation (Always Required)

- **Never rely solely on client-side validation.** All data must be re-validated on the server.
- Use **Joi** or **Zod** for schema-based validation on every API endpoint.

```js
// Zod schema example
const { z } = require('zod');

const CreateUserSchema = z.object({
  email: z.string().email().max(254),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(12).max(128),
});

function validateInput(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.flatten() });
    }
    req.validatedBody = result.data;
    next();
  };
}
```

### 2.2 SQL Injection Prevention

- **Always use parameterized queries or ORMs** — never concatenate user input into SQL strings.

```js
// ✅ Safe — parameterized query
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ Unsafe — string concatenation
const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

### 2.3 NoSQL Injection Prevention

- Sanitize all MongoDB queries using libraries like `mongo-sanitize`.
- Avoid passing raw `req.body` objects directly to Mongoose queries.

```js
const sanitize = require('mongo-sanitize');
const safeQuery = sanitize(req.body);
```

### 2.4 XSS Prevention

- Use **DOMPurify** to sanitize any HTML before rendering in React.
- Avoid `dangerouslySetInnerHTML`; if required, always sanitize first.
- Content rendered via JSX is auto-escaped by React — do not bypass this.

---

## 3. API Security

### 3.1 Rate Limiting

- Apply rate limiting to **all public endpoints**, especially auth routes.

```js
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
```

### 3.2 CORS Configuration

- Whitelist only known frontend origins — never use `origin: '*'` in production.

```js
const cors = require('cors');

const corsOptions = {
  origin: ['https://yourapp.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};

app.use(cors(corsOptions));
```

### 3.3 CSRF Protection

- Use `csurf` or `csrf-csrf` for state-changing requests when using cookies.
- Double Submit Cookie pattern is acceptable for stateless SPAs.

### 3.4 Request Size Limiting

```js
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

### 3.5 API Versioning

- Version all API routes (e.g., `/api/v1/`) to allow controlled deprecation of insecure endpoints.

---

## 4. Data Security & Storage

### 4.1 Encryption

- Encrypt sensitive data at rest using **AES-256-GCM**.
- Always use **TLS 1.2+** for data in transit; enforce HTTPS everywhere.
- Never store sensitive data (SSNs, payment info, health data) in plaintext.

```js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted: encrypted.toString('hex'), iv: iv.toString('hex'), tag: tag.toString('hex') };
}
```

### 4.2 Database Security

- Use a **dedicated, least-privilege** database user per service.
- Never expose your database port publicly; use private networking.
- Enable query logging for audit purposes in production.
- Implement regular **automated backups** with tested restore procedures.

### 4.3 File Uploads

- Validate MIME type and file extension server-side (not just the Content-Type header).
- Scan uploaded files with an antivirus solution before processing.
- Store uploads outside the web root or in a separate object storage service (S3, GCS).
- Rename uploaded files to random UUIDs — never use user-supplied filenames.
- Set a maximum file size limit.

---

## 5. Frontend Security (React)

### 5.1 Sensitive Data in the Client

- Never store tokens, secrets, or PII in `localStorage` or `sessionStorage`.
- Use React Context or a state management library (Zustand, Redux) to hold access tokens in memory.
- Clear all auth state on logout by resetting state and invalidating the refresh token server-side.

### 5.2 Environment Variables

- All React env variables prefixed with `REACT_APP_` are **bundled into the client** — treat them as public.
- Never put secrets, API keys, or private tokens in React env vars.

### 5.3 Content Security Policy (CSP)

- Define a strict CSP header to prevent XSS from untrusted script sources.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.yourapp.com;
  frame-ancestors 'none';
```

### 5.4 Dependency Security in React

- Avoid third-party packages that directly manipulate the DOM.
- Audit `package.json` regularly with `npm audit`.

---

## 6. Dependency Management

- Run `npm audit` as part of your CI pipeline; fail builds on **high/critical** vulnerabilities.
- Use **Dependabot** or **Snyk** to automate dependency update PRs.
- Pin dependency versions in `package-lock.json` — commit this file to source control.
- Regularly review and remove unused dependencies.

```bash
# Audit and fix
npm audit
npm audit fix

# Check for outdated packages
npm outdated
```

---

## 7. Environment & Configuration

### 7.1 Secret Management

- Use `.env` files for local development only — never commit them to version control.
- Use a secrets manager in production: **AWS Secrets Manager**, **HashiCorp Vault**, or **GCP Secret Manager**.
- Rotate secrets regularly and after any suspected exposure.

```bash
# .gitignore — ensure these are excluded
.env
.env.local
.env.production
*.pem
*.key
```

### 7.2 Environment Separation

- Maintain separate environments: `development`, `staging`, `production`.
- Production secrets must never be used in development or staging.
- Use different database instances per environment.

### 7.3 Helmet.js (Express Security Headers)

```js
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));
```

---

## 8. Logging & Monitoring

### 8.1 What to Log

- Authentication events: login, logout, failed attempts, MFA events.
- Authorization failures (403 responses).
- Input validation failures on sensitive endpoints.
- Admin actions and data mutations.
- Unexpected server errors (5xx).

### 8.2 What NOT to Log

- Passwords or password hashes.
- Full JWT tokens or session IDs.
- Credit card numbers, SSNs, or PII in plaintext.
- Complete request/response bodies for sensitive endpoints.

### 8.3 Structured Logging

```js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Usage
logger.warn('Failed login attempt', {
  email: redactEmail(email),
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});
```

### 8.4 Alerting

- Set up alerts for: repeated 401/403 errors, unusual traffic spikes, login brute-force patterns.
- Integrate with monitoring tools (Datadog, Grafana, CloudWatch, Sentry).

---

## 9. Error Handling

- Never expose stack traces, internal file paths, or database errors to API consumers.
- Return **generic error messages** to clients; log detailed errors server-side.
- Use a centralized error handler in Express.

```js
// Express global error handler — place after all routes
app.use((err, req, res, next) => {
  const status = err.status || 500;

  // Log full error internally
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Return safe response to client
  res.status(status).json({
    error: status === 500 ? 'An internal error occurred' : err.message,
  });
});
```

---

## 10. Infrastructure & Deployment

### 10.1 Container Security (Docker)

- Run Node.js as a **non-root user** inside containers.
- Use minimal base images (e.g., `node:20-alpine`).
- Scan images with **Trivy** or **Docker Scout** in CI.

```dockerfile
FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
```

### 10.2 CI/CD Security

- Run `npm audit`, linting, and SAST (Static Application Security Testing) on every PR.
- Use **GitHub Actions** secrets or equivalent — never hardcode credentials in workflows.
- Require **code review approval** before merging to main/production branches.
- Sign commits and enforce branch protection rules.

### 10.3 Network Security

- Place your Node.js API behind a **reverse proxy** (Nginx, Cloudflare) — never expose it directly.
- Use a **Web Application Firewall (WAF)** for public-facing APIs.
- Restrict database and internal services to private network interfaces only.

---

## 11. Security Headers Checklist

| Header | Recommended Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | Defined per [Section 5.3](#53-content-security-policy-csp) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` |
| `Cache-Control` (API) | `no-store` |

---

## 12. AI-Assisted Development Notes

When using **GitHub Copilot** or **Claude** to generate code, keep the following in mind:

- **Always review generated code for security issues** — AI tools can suggest insecure patterns (e.g., string-concatenated queries, disabled SSL verification).
- Prompt AI with security context: _"Generate this using parameterized queries and input validation."_
- Never accept AI-generated code that includes hardcoded credentials, even as placeholders — replace immediately.
- Use AI to generate **tests for security edge cases**: empty inputs, oversized payloads, malformed tokens.
- Validate generated regex patterns against ReDoS (Regular Expression Denial of Service) vulnerabilities.
- Treat AI suggestions as a starting point — always pass them through your own security review and `npm audit`.

---

## References

- [OWASP Top 10 (2021)](https://owasp.org/www-project-top-ten/)
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [OWASP React Security Guide](https://cheatsheetseries.owasp.org/cheatsheets/React_Security_Cheat_Sheet.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security)
- [Helmet.js Docs](https://helmetjs.github.io/)
- [NIST Password Guidelines (SP 800-63B)](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

*Document version: 1.0 — Review and update this document at the start of each major feature cycle or at minimum every 6 months.*
