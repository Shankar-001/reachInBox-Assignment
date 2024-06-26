const axios = require('axios');
// const { OAuth2Client } = require('google-auth-library');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// const oAuth2Client = new OAuth2Client({
//   clientId: process.env.GOOGLE_CLIENT_ID,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//   redirectUri: process.env.GOOGLE_REDIRECT_URI,
// });

// oAuth2Client.setCredentials({
//   refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
// });

const createLabelIfNotExist = async (email, token, labelName) => {
  try {
    const listLabelsResponse = await axios.get(
      `https://gmail.googleapis.com/gmail/v1/users/me/labels`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const labels = listLabelsResponse.data.labels;
    let labelId = labels.find((label) => label.name === labelName)?.id;

    if (!labelId) {
      // Create the label if it does not exist
      const createLabelResponse = await axios.post(
        `https://gmail.googleapis.com/gmail/v1/users/me/labels`,
        {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      labelId = createLabelResponse.data.id;
    }

    return labelId;
  } catch (error) {
    console.error(
      'Error checking/creating label:',
      error.response ? error.response.data : error.message
    );
    throw new Error(
      "Can't check/create label: " +
        (error.response ? error.response.data.error.message : error.message)
    );
  }
};

const classifyEmailWithGemini = async (emailContent) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  try {
    // Prompt to classify email content and generate a response
    const prompt = `
      Subject: Classification and Response Generation for Incoming Email

      Email Content:
      ${emailContent}

      Classification:
      1. Classify the intent of the email (e.g., Interested, Information Request, Not Interested).
      2. Based on the classification, generate a suitable response email.

      My Information:
      Name: Praveen Shankar
      Company: Reach Inbox

      Response:
      Write a response email that corresponds to the intent classified above. Include details such as thanking the sender, providing information, or scheduling a follow-up.

      Example Response:
        
      {
        "responseEmail": "Dear Sender,\n\n Thank you for your email. We have noted your interest in our services/products. Please find below the information you requested. If you have any further questions or would like to schedule a demo, please let us know. \n\nBest regards, \n Praveen \nReach Inbox",
        "classifiedIntent": "Interested"
      }  
      
      End of Prompt.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonText = text.split('```json')[1].split('```')[0].trim();
    const objRes = JSON.parse(jsonText);

    console.log('text', text);

    // Prepare the JSON object containing the classified intent and response email
    const label = objRes.classifiedIntent;
    const replyMessage = objRes.responseEmail;

    const classificationResult = {
      label,
      replyMessage,
    };

    return classificationResult;
  } catch (error) {
    console.error('Error classifying email with Gemini API:', error.message);
    throw new Error('Error classifying email with Gemini API');
  }
};

const formatReplyMessage = (message) => {
  return message
    .replace(/\n/g, '<br>')
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
};

const sendMail = async (data, token) => {
  try {
    if (!token) {
      throw new Error('Token not found, please login again to get token');
    }

    const geminiResponse = await classifyEmailWithGemini(data.message);

    const { label, replyMessage } = geminiResponse;

    const formattedReplyMessage = formatReplyMessage(replyMessage);

    const emailContent = `
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">${label} from ReachInbox</h2>
        ${formattedReplyMessage}
      </div>`;

    const mailOptions = {
      from: data.from,
      to: data.to,
      subject: `${label} from ReachInbox`,
      text: replyMessage,
      html: emailContent,
    };

    const emailData = {
      raw: Buffer.from(
        [
          'Content-Type: text/html; charset=UTF-8',
          'MIME-Version: 1.0',
          `From: ${data.from}`,
          `To: ${data.to}`,
          `Subject: ${mailOptions.subject}`,
          '',
          `${mailOptions.html}`,
        ].join('\r\n')
      ).toString('base64'),
    };

    const sendMessageResponse = await axios.post(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
      emailData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Ensure the label exists and get its ID
    const labelId = await createLabelIfNotExist(data.from, token, label);

    // Modify label for the sent email
    const labelUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${sendMessageResponse.data.id}/modify`;
    const labelConfig = {
      method: 'POST',
      url: labelUrl,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        addLabelIds: [labelId],
      },
    };
    await axios(labelConfig);

    return sendMessageResponse.data.id;
  } catch (error) {
    console.error(
      'Error sending email:',
      error.response ? error.response.data : error.message
    );
    throw new Error(
      "Can't send email: " +
        (error.response ? error.response.data.error.message : error.message)
    );
  }
};


module.exports = {
  sendMail,
  createLabelIfNotExist,
  classifyEmailWithGemini,
  
};
