const express = require('express');
const { google } = require('googleapis');
const open = require('open');
const cors = require('cors');

const app = express();
const port = 5500;

// Enable CORS for all routes
app.use(cors());

const oauth2Client = new google.auth.OAuth2(
  
);

const scopes = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
];

app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  res.redirect(url);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.send('Authentication successful! You can close this tab.');
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('Token:', tokens);
  } catch (error) {
    console.error('Error retrieving access token', error);
    res.status(500).send('Error retrieving access token');
  }
});

app.listen(port, () => {
  console.log(`App listening at http://127.0.0.1:${port}`);
  // Automatically open the browser to start the auth flow
  open(`http://127.0.0.1:${port}/auth`);
});
