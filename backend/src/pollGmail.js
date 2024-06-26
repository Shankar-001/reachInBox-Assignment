const express = require("express");
const axios = require("axios");
const { google } = require("googleapis");
const redis = require("ioredis");
const bodyParser = require("body-parser");
require("dotenv").config();
const {
  redisSetToken,
  redisGetToken,
  getAllEmailTokenPairsFromRedis,
  redisRemoveToken,
} = require("./middlewares/redis.middleware");
const { OAuth2Client } = require("google-auth-library");
const { Client } = require("@microsoft/microsoft-graph-client");

const app = express();
const port = 4000;

app.use(bodyParser.json());

const oAuth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

// Polling function to check for new emails at intervals
const pollEmails = () => {
  setInterval(async () => {
    try {
      const { emailTokenPairs, gmailTokenPairs, outlookTokenPairs } = await getAllEmailTokenPairsFromRedis();

      // Check Gmail emails
      for (const { email, token } of gmailTokenPairs) {
        await checkForNewGmailEmails(email, token);
      }

      // Check Outlook emails
      // for (const { email, token } of outlookTokenPairs) {
      //   await checkForNewOutlookEmails(email, token);
      // }
    } catch (error) {
      console.error("Error polling emails:", error.message);
    }
  }, 5000); // Check every 5 seconds
};

// Function to check for new Gmail emails
const checkForNewGmailEmails = async (email, token) => {
  try {
    oAuth2Client.setCredentials(token);

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    const response = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread",
    });

    const messages = response.data.messages || [];

    if (messages.length > 0) {
      console.log(`New Gmail emails found for ${email}:`, messages);

      // Process the new emails
      for (const message of messages) {
        await processGmailEmail(email, message.id, token);
      }
    } else {
      console.log(`No new Gmail emails for ${email}`);
    }
  } catch (error) {
    console.error(`Error checking for new Gmail emails for ${email}:`, error.message);

    if (error.message.includes("No refresh token")) {
      // Token has expired or is invalid, remove from Redis
      await redisRemoveToken(email);
    }
  }
};

// Function to process each new Gmail email
const processGmailEmail = async (email, messageId, token) => {
  try {
    oAuth2Client.setCredentials(token);

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    const message = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
    });

    // Extract email details
    const headers = message.data.payload.headers;
    const fromHeader = headers.find((header) => header.name === "From");
    const toHeader = headers.find((header) => header.name === "To");
    const fromEmail = fromHeader ? fromHeader.value : "";
    let toEmail = toHeader ? toHeader.value : "";

    // Extract the email address part from the 'To' field
    const emailMatch = fromEmail?.split("<")[1]?.split(">")[0];
    toEmail = emailMatch ? emailMatch : fromEmail;
    if (!toEmail) {
      return;
    }

    const snippet = message.data.snippet;

    // Prepare data for sending automated reply
    const data = {
      from: email,
      to: toEmail,
      label: "", // This will be determined by the Gemini API in the sendMail function
      message: snippet,
    };

    // Call the sendMail API to send an automated reply
    const apiUrl = `http://localhost:3000/api/mail/sendMail/${email}`;
    await axios.post(apiUrl, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Mark the email as read
    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        removeLabelIds: ["UNREAD"],
      },
    });
  } catch (error) {
    console.error(`Error processing Gmail email ${messageId} for ${email}:`, error.message);
  }
};

// Function to check for new Outlook emails
const checkForNewOutlookEmails = async (email, token) => {
  try {
    const client = Client.init({
      authProvider: (done) => {
        done(null, token.accessToken);
      },
    });
    // console.log('client is set',client);

    const response = await client.api('/me/mailFolders')
      // .filter("isRead eq false")
      // .top(10)
      // .select("id,subject,from,receivedDateTime")
      .get();
    console.log('response',response);

    const messages = response.value || [];

    if (messages.length > 0) {
      console.log(`New Outlook emails found for ${email}:`, messages);

      // Process the new emails
      for (const message of messages) {
        await processOutlookEmail(email, message, token);
      }
    } else {
      console.log(`No new Outlook emails for ${email}`);
    }
  } catch (error) {
    console.error(`Error checking for new Outlook emails for ${email}:`, error.message);

    if (error.message.includes("Access token has expired")) {
      // Token has expired or is invalid, remove from Redis
      await redisRemoveToken(email);
    }
  }
};

// Function to process each new Outlook email
const processOutlookEmail = async (email, message, token) => {
  try {
    const client = Client.init({
      authProvider: (done) => {
        done(null, token.accessToken);
      },
    });

    const fromEmail = message.from.emailAddress.address;
    const toEmail = email;
    const subject = message.subject;
    const messageId = message.id;

    // Prepare data for sending automated reply
    const data = {
      from: email,
      to: fromEmail,
      label: "", // This will be determined by the Gemini API in the sendMail function
      message: subject,
    };

    // Call the sendMail API to send an automated reply
    const apiUrl = `http://localhost:3000/api/mail/sendMail/${email}`;
    await axios.post(apiUrl, data, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
    });

    // Mark the email as read
    await client.api(`/me/messages/${messageId}`)
      .patch({ isRead: true });
  } catch (error) {
    console.error(`Error processing Outlook email ${message.id} for ${email}:`, error.message);
  }
};

// Start the polling process
pollEmails();

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
