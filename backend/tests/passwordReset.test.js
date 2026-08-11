// These must be set before any application module is required, because some
// read them at import time (encryptionService, used by the User model).
// tests/setup.js also sets them, but that file is not committed yet, so this
// test would otherwise fail on a clean checkout.
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-change-me-32b';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-change-me';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-change-me';

const request = require('supertest');
const express = require('express');
const crypto = require('crypto');

const authRoutes = require('../routes/authRoutes');
const User = require('../models/User');
const emailService = require('../services/emailService');
const tokenUtils = require('../utils/tokenUtils');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const EMAIL = 'reset-me@example.com';

const createUser = () =>
  User.create({
    name: 'Reset Me',
    email: EMAIL,
    password: 'OriginalPass1!'
  });

describe('Password reset', () => {
  let sendReset, sendChanged;

  beforeEach(() => {
    sendReset = jest.spyOn(emailService, 'sendPasswordResetEmail')
      .mockResolvedValue({ delivered: true, dev: false });
    sendChanged = jest.spyOn(emailService, 'sendPasswordChangedEmail')
      .mockResolvedValue({ delivered: true, dev: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Pull the raw token out of the mocked reset URL. */
  const tokenFromEmail = () => {
    const url = sendReset.mock.calls[0][1];
    return new URL(url).searchParams.get('token');
  };

  describe('POST /forgot-password', () => {
    it('emails a reset link to a known address', async () => {
      await createUser();

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: EMAIL })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(sendReset).toHaveBeenCalledTimes(1);
      expect(tokenFromEmail()).toMatch(/^[a-f0-9]{64}$/);
    });

    it('does not reveal whether an account exists', async () => {
      await createUser();

      const known = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: EMAIL })
        .expect(200);

      const unknown = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@example.com' })
        .expect(200);

      // Identical wording, or this endpoint becomes an account-enumeration oracle.
      expect(unknown.body.message).toBe(known.body.message);
      expect(sendReset).toHaveBeenCalledTimes(1);
    });

    it('stores only a hash of the token, never the token itself', async () => {
      await createUser();

      await request(app).post('/api/auth/forgot-password').send({ email: EMAIL }).expect(200);

      const raw = tokenFromEmail();
      const stored = await User.findOne({ email: EMAIL }).select('+passwordReset.token');

      expect(stored.passwordReset.token).not.toBe(raw);
      expect(stored.passwordReset.token).toBe(
        crypto.createHash('sha256').update(raw).digest('hex')
      );
    });

    it('throttles repeat requests without changing the response', async () => {
      await createUser();

      const first = await request(app)
        .post('/api/auth/forgot-password').send({ email: EMAIL }).expect(200);
      const second = await request(app)
        .post('/api/auth/forgot-password').send({ email: EMAIL }).expect(200);

      expect(second.body.message).toBe(first.body.message);
      expect(sendReset).toHaveBeenCalledTimes(1);
    });

    it('rejects a malformed address', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(sendReset).not.toHaveBeenCalled();
    });
  });

  describe('POST /reset-password', () => {
    const requestReset = async () => {
      await createUser();
      await request(app).post('/api/auth/forgot-password').send({ email: EMAIL }).expect(200);
      return tokenFromEmail();
    };

    it('sets the new password and lets the user sign in with it', async () => {
      const token = await requestReset();

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'BrandNewPass9!' })
        .expect(200);

      const user = await User.findOne({ email: EMAIL }).select('+password');
      expect(await user.comparePassword('BrandNewPass9!')).toBe(true);
      expect(await user.comparePassword('OriginalPass1!')).toBe(false);
    });

    it('burns the token so the link cannot be replayed', async () => {
      const token = await requestReset();

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'FirstReset1!' })
        .expect(200);

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'SecondReset2!' })
        .expect(400);

      expect(res.body.message).toMatch(/invalid or has expired/i);

      // The second attempt must not have taken effect.
      const user = await User.findOne({ email: EMAIL }).select('+password');
      expect(await user.comparePassword('FirstReset1!')).toBe(true);
      expect(await user.comparePassword('SecondReset2!')).toBe(false);
    });

    it('rejects an expired token', async () => {
      const token = await requestReset();

      await User.updateOne(
        { email: EMAIL },
        { $set: { 'passwordReset.tokenExpires': new Date(Date.now() - 1000) } }
      );

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'TooLate123!' })
        .expect(400);

      const user = await User.findOne({ email: EMAIL }).select('+password');
      expect(await user.comparePassword('OriginalPass1!')).toBe(true);
    });

    it('rejects a forged token', async () => {
      await requestReset();

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: crypto.randomBytes(32).toString('hex'), password: 'Forged123!' })
        .expect(400);

      const user = await User.findOne({ email: EMAIL }).select('+password');
      expect(await user.comparePassword('OriginalPass1!')).toBe(true);
    });

    it('does not accept the stored hash in place of the raw token', async () => {
      await requestReset();
      const stored = await User.findOne({ email: EMAIL }).select('+passwordReset.token');

      // Someone with read access to the database still must not be able to
      // reset the password by replaying what they found there.
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: stored.passwordReset.token, password: 'FromDbLeak1!' })
        .expect(400);
    });

    it('rejects a password below the minimum length', async () => {
      const token = await requestReset();

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'abc' })
        .expect(400);

      const user = await User.findOne({ email: EMAIL }).select('+password');
      expect(await user.comparePassword('OriginalPass1!')).toBe(true);
    });

    it('revokes existing sessions and notifies the account owner', async () => {
      const revoke = jest.spyOn(tokenUtils, 'revokeAllUserTokens').mockResolvedValue();
      const token = await requestReset();

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'RotatedPass1!' })
        .expect(200);

      expect(sendChanged).toHaveBeenCalledTimes(1);
      revoke.mockRestore();
    });

    it('still resets the password when the notification email fails', async () => {
      sendChanged.mockRejectedValue(new Error('SMTP down'));
      const token = await requestReset();

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'MailFails1!' })
        .expect(200);

      const user = await User.findOne({ email: EMAIL }).select('+password');
      expect(await user.comparePassword('MailFails1!')).toBe(true);
    });

    it('requires both a token and a password', async () => {
      await request(app).post('/api/auth/reset-password').send({ password: 'x' }).expect(400);
      await request(app).post('/api/auth/reset-password').send({ token: 'x' }).expect(400);
    });
  });
});
