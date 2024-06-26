const { sendMail } = require('../controllers/message.Controller');
const { redisGetToken } = require('../middlewares/redis.middleware');
const Router = require('express');
const { emailQueue } = require('../utils/queue');
const router = Router();

router.post('/sendMail/:email', async (req, res) => {
  try {
    // const token = await redisGetToken(req.params.email);
    // const result = await sendMail(req.body, token);
    // res.status(200).json({ message: 'Email sent successfully', result });

    const token = await redisGetToken(req.params.email);
    await emailQueue.add('sendMail', {
      emailData: req.body,
      token,
    });
    res.status(200).json({ message: 'Email queued successfully' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
