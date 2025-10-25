require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const FinancialProfile = require('./models/FinancialProfile');
const gmailService = require('./services/gmailService');

async function run() {
  try {
    const userId = process.argv[2];
    if (!userId) {
      console.error('Usage: node test-gmail-fetch.js <userId>');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    const profile = await FinancialProfile.findOne({ userId })
      .select('+gmailSettings.accessToken +gmailSettings.refreshToken +gmailSettings.grantedScopes');

    if (!profile || !profile.gmailSettings?.isConnected) {
      console.error('Profile not found or Gmail not connected for user:', userId);
      return;
    }

    console.log('Gmail settings found:', {
      email: profile.gmailSettings.email,
      grantedScopes: profile.gmailSettings.grantedScopes,
      hasAccessToken: !!profile.gmailSettings.accessToken,
      hasRefreshToken: !!profile.gmailSettings.refreshToken
    });

    const service = gmailService.GmailService.getUserInstance({
      access_token: profile.gmailSettings.accessToken,
      refresh_token: profile.gmailSettings.refreshToken
    });

    console.log('Attempting to search Gmail for recent financial emails...');
    try {
      const result = await service.searchFinancialEmails(userId.toString(), {
        maxResults: 5,
        dateAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      });
      console.log('Search succeeded:', {
        resultSizeEstimate: result.resultSizeEstimate,
        messagesReturned: result.messages?.length || 0,
        nextPageToken: result.nextPageToken || null
      });
    } catch (err) {
      console.error('Search failed:', err.message);
      if (err.code) {
        console.error('Error code:', err.code);
      }
      if (err.requiresReauth) {
        console.error('This error indicates missing Gmail scopes. Please remove the app from Google permissions and reconnect.');
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
