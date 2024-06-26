const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const { redisSetToken } = require('../middlewares/redis.middleware');
const Router = require('express');
const router = Router();

// google oauth
const oAuth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

const scopes = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
];

router.get('/auth/google', (req, res) => {
  console.log('called here');
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  res.redirect(authUrl);
});

router.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code missing.');
  }

  try {
    // console.log("Authorization code received:", code);

    // Exchange the authorization code for tokens
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    console.log('Tokens received:', tokens);

    // Use the access token to retrieve user information
    const oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: 'v2',
    });

    const userInfo = await oauth2.userinfo.get();
    // console.log("User info received:", userInfo.data);

    const email = userInfo.data.email;
    const { access_token, refresh_token, scope } = tokens;

    // Store tokens in Redis (or any other storage mechanism)
    await redisSetToken(email, tokens);

    // const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    // // const topicName = "projects/YOUR_PROJECT_ID/topics/YOUR_TOPIC_NAME"; // Replace with your actual topic name
    // const topicName =
    //   "projects/reachinbox-1719300482148/topics/test";

    // console.log("watching for changes");
    // const watchResponse = await gmail.users.watch({
    //   userId: "me",
    //   requestBody: {
    //     labelIds: ["INBOX"],
    //     topicName: topicName,
    //   },
    // });

    // console.log("Watch response:", watchResponse.data);
    // Send the tokens and email to the client
    res.json({
      email,
      tokens,
      // watchResponse: watchResponse.data,
    });
  } catch (error) {
    console.error('Error exchanging authorization code:', error.message);
    res.status(500).send('Error exchanging authorization code.');
  }
});

module.exports = router;
