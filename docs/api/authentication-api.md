# Authentication API Reference

> JWT-based authentication with 2FA support, token rotation, and account lockout

---

## Overview

The authentication system supports:
- **JWT Access + Refresh Token** pair with automatic rotation
- **Two-Factor Authentication (2FA)** via TOTP (Speakeasy)
- **Account Lockout** after 5 failed attempts (30-minute lock)
- **Dual Backend** — local MongoDB or Firebase Auth
- **"Remember Me"** support with extended token lifetime
- **Gmail OAuth** integration for email syncing

---

## Endpoints

### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "role": "user"
}
```

**Validation:**
- `name`: 2-50 chars, trimmed
- `email`: valid email format, unique
- `password`: min 6 chars

**Response (201):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "user" }
}
```

---

### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "rememberMe": true
}
```

**Response (200) — Normal:**
```json
{
  "success": true,
  "token": "...",
  "refreshToken": "...",
  "user": { ... }
}
```

**Response (200) — 2FA Required:**
```json
{
  "success": true,
  "requires2FA": true,
  "tempToken": "...",
  "message": "2FA verification required"
}
```

**Account Lockout (423):**
```json
{
  "success": false,
  "error": "Account locked. Try again in X minutes"
}
```

---

### POST `/api/auth/login/2fa`
Complete 2FA login.

**Request Body:**
```json
{
  "tempToken": "...",
  "code": "123456"
}
```

---

### GET `/api/auth/me`
Get authenticated user info. **Requires Auth.**

**Response:**
```json
{
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "lastLogin": "2026-03-05T..."
  }
}
```

---

### POST `/api/auth/refresh-token`
Rotate tokens. Old refresh token is revoked.

**Request Body:**
```json
{
  "refreshToken": "current_refresh_token"
}
```

---

### POST `/api/auth/logout`
Logout and revoke refresh token. **Requires Auth.**

### PUT `/api/auth/password`
Change password. **Requires Auth.**

**Request Body:**
```json
{
  "currentPassword": "OldPassword",
  "newPassword": "NewSecurePassword!"
}
```

### DELETE `/api/auth/account`
Permanently delete account and all data. **Requires Auth.**

---

## Security Measures

| Feature | Implementation |
|---------|---------------|
| Password Hashing | bcrypt (10 salt rounds) |
| 2FA Secret Storage | AES-256-GCM encryption at rest |
| Token Type | JWT with HS256 signing |
| Token Lifetime | Access: 24h / Refresh: 7d (or 30d with rememberMe) |
| Account Lockout | 5 failed attempts → 30-minute lock |
| Rate Limiting | 5 auth requests per 15 minutes (production) |
| IP Tracking | Stored with each token for audit |

---

## Token Storage (Frontend)

The frontend `AuthContext` stores tokens in:
- **localStorage** — persistent, with expiry date (end-of-month or 30 days for new registration)
- **sessionStorage** — session-only fallback

Token expiry is validated on every read; expired tokens are auto-cleared.

---

## 2FA Setup Flow

1. Call `POST /api/2fa/setup` → returns QR code + backup codes
2. User scans QR with authenticator app (Google Authenticator, Authy)
3. Call `POST /api/2fa/verify` with TOTP code to confirm setup
4. On next login, user receives `requires2FA: true` response
5. Complete login with `POST /api/auth/login/2fa` + TOTP code
6. Backup codes available for recovery
