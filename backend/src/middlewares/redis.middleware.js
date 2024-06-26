const Redis = require("ioredis");

const connection = new Redis(
  {
    port: process.env.redis_port,
    host: process.env.redis_host,
    password: process.env.redis_pass,
  },
  {
    maxRetriesPerRequest: null,
  }
);

const redisGetToken = async (email) => {
  try {
    const token = await connection.get(email);
    if (token) {
      // console.log("Token retrieved from Redis:", JSON.parse(token));
      const parsedToken = JSON.parse(token);
      return parsedToken.access_token;
    } else {
      console.log(`No token found in Redis for email ${email}`);
      return null;
    }
  } catch (error) {
    console.error(
      `Error retrieving token from Redis for email ${email}:`,
      error.message
    );
    throw new Error(`Error retrieving token from Redis for email ${email}.`);
  }
};
const redisGetFullToken = async (email) => {
  try {
    const token = await connection.get(email);
    if (token) {
      // console.log("Token retrieved from Redis:", JSON.parse(token));
      const parsedToken = JSON.parse(token);
      return parsedToken;
    } else {
      console.log(`No token found in Redis for email ${email}`);
      return null;
    }
  } catch (error) {
    console.error(
      `Error retrieving token from Redis for email ${email}:`,
      error.message
    );
    throw new Error(`Error retrieving token from Redis for email ${email}.`);
  }
};

const redisSetToken = async (email, token) => {
  try {
    // console.log("Setting token in Redis:", email, token);
    const result = await connection.set(email, JSON.stringify(token));
    return result;
  } catch (error) {
    console.error(
      `Error setting token in Redis for email ${email}:`,
      error.message
    );
    throw new Error(`Error setting token in Redis for email ${email}.`);
  }
};


const getAllEmailTokenPairsFromRedis = async () => {
  try {
    const keys = await connection.keys("*");
    // console.log("Keys in Redis:", keys);
    const emailTokenPairs = [];

    const gmailTokenPairs = [];
    const outlookTokenPairs = [];

    // const skipKeys = ["", "bull:outlook-queue:meta", "bull:email-queue:meta",'bull:emailQueue:meta','bull:emailQueue:stalled-check',];

    for (const key of keys) {
      if (key !==""  && !key.includes('bull:') ) {
        // console.log('key:', key);
        const token = await redisGetFullToken(key);

        if(token.scope.includes('https://www.googleapis.com/auth/gmail.readonly')){
          emailTokenPairs.push({ email: key, token });
          gmailTokenPairs.push({ email: key, token });

        }
        else{
          outlookTokenPairs.push({ email: key, token });
        }
      }
    }
    // console.log("All email-token pairs from Redis:", emailTokenPairs);
    return {emailTokenPairs,gmailTokenPairs,outlookTokenPairs};
  } catch (error) {
    console.error(
      "Error retrieving all email-token pairs from Redis:",
      error.message
    );
  }
};


const redisRemoveToken = async (email) => {
  try {
    await connection.del(email);
    console.log(`Removed email-token pair for ${email} from Redis.`);
  } catch (error) {
    console.error(
      `Error removing email-token pair from Redis for ${email}:`,
      error.message
    );
  }
};

module.exports = {
  connection,
  redisGetToken,
  redisSetToken,
  getAllEmailTokenPairsFromRedis,
  redisRemoveToken,
};
