const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { sendMail } = require('../controllers/message.Controller');

const connection = new IORedis(
    {
      port: process.env.redis_port,
      host: process.env.redis_host,
      password: process.env.redis_pass,
    },
    {
      maxRetriesPerRequest: null,
    }
  );

const emailQueue = new Queue('emailQueue', { connection });

const worker = new Worker('emailQueue', async job => {
  const { emailData, token } = job.data;
  await sendMail(emailData, token);
}, { connection });

worker.on('completed', job => {
  console.log(`Job completed with result ${job.returnvalue}`);
});

worker.on('failed', (job, err) => {
  console.log(`Job failed with error ${err.message}`);
});

module.exports = { emailQueue };
