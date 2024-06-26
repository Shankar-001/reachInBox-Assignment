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
      const emailTokenPairs = await getAllEmailTokenPairsFromRedis();

      for (const { email, token } of emailTokenPairs) {
        await checkForNewEmails(email, token);
      }
    } catch (error) {
      console.error("Error polling emails:", error.message);
    }
  }, 5000); // Check every 5 seconds
};

// Function to check for new emails
const checkForNewEmails = async (email, token) => {
  try {
    oAuth2Client.setCredentials(token);

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    const response = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread",
    });

    const messages = response.data.messages || [];

    if (messages.length > 0) {
      console.log(`New emails found for ${email}:`, messages);

      // Process the new emails
      for (const message of messages) {
        await processEmail(email, message.id, token);
      }
    } else {
      console.log(`No new emails for ${email}`);
    }
  } catch (error) {
    console.error(`Error checking for new emails for ${email}:`, error.message);

    if (error.message.includes("No refresh token")) {
      // Token has expired or is invalid, remove from Redis
      await redisRemoveToken(email);
    }
  }
};

// Function to process each new email
const processEmail = async (email, messageId, token) => {
  try {
    oAuth2Client.setCredentials(token);

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    const message = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
    });

    // Process the email content
    // console.log(`Processing email for ${email}:`, message.data);

    // Extract email details
    const headers = message.data.payload.headers;
    const fromHeader = headers.find((header) => header.name === "From");
    const toHeader = headers.find((header) => header.name === "To");
    const fromEmail = fromHeader ? fromHeader.value : "";
    let toEmail = toHeader ? toHeader.value : "";

    // Extract the email address part from the 'To' field
    const emailMatch = fromEmail?.split("<")[1]?.split(">")[0];
    console.log("emailMatch:", emailMatch);
    toEmail = emailMatch ? emailMatch : fromEmail;
    if (!toEmail) {
      console.log("fromEmail:", fromEmail);
      console.log("emailMatch:", emailMatch);
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

    console.log("data:", data);
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
    console.error(
      `Error processing email ${messageId} for ${email}:`,
      error.message
    );
  }
};

// Start the polling process
pollEmails();

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
