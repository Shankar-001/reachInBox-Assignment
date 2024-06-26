require("dotenv").config(); // Load environment variables from .env file
const { GoogleGenerativeAI } = require("@google/generative-ai");

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



const testEmailContent = `
  Subject: Inquiry about your product

  Hi there,

  I recently came across your product and I am very interested in learning more about its features and pricing. Could you please provide me with more details?

  Thanks,
  John Doe
`;

const testClassifyEmail = async () => {
  try {
    const result = await classifyEmailWithGemini(testEmailContent);
    console.log("Classified Intent:", result.label);
    console.log("Response Email:", result.replyMessage);
  } catch (error) {
    console.error("Error during testing:", error.message);
  }
};

testClassifyEmail();
