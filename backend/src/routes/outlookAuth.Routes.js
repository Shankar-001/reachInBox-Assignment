const express = require('express');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
const { redisSetToken } = require('../middlewares/redis.middleware');
const router = express.Router();

// Set up Redis client
// const redisClient = redis.createClient();
// redisClient.on('error', (err) => console.error('Redis Client Error', err));

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

const redirectUri = process.env.AZURE_REDIRECT_URI;
const scopes = ['openid', 'profile', 'User.Read', 'Mail.ReadWrite', 'Mail.Send'];

router.get('/auth/microsoft', (req, res) => {
  const authCodeUrlParameters = {
    scopes: scopes,
    redirectUri: redirectUri,
  };

  cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
    res.redirect(response);
  }).catch((error) => {
    console.error('Error generating auth code URL:', error);
    res.status(500).send('Error generating auth code URL.');
  });
});

router.get('/auth/microsoft/callback', async (req, res) => {
  const tokenRequest = {
    code: req.query.code,
    scopes: scopes,
    redirectUri: redirectUri,
  };
  // console.log('tokenRequest', tokenRequest.code);

  try {
    const response = await cca.acquireTokenByCode(tokenRequest);
    const { accessToken, refreshToken, account } = response;

    const email = account.username;
    console.log('outlook sign in with account : ', email);

    // Store tokens in Redis (or any other storage mechanism)
    await redisSetToken(email, { accessToken, refreshToken , scope : scopes.join(' ') });
    
    res.json({
      email,
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error('Error exchanging authorization code:', error.message);
    res.status(500).send('Error exchanging authorization code.');
  }
});

module.exports = router;
