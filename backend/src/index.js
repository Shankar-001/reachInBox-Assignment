const express = require('express');
const session = require('express-session');
const cors = require('cors');

const bodyParser = require('body-parser');

const app = express();
require('dotenv').config();

const router = require('./routes/message.Routes');
const googleAuthRouter = require('./routes/googleAuth.Routes');
// const outlookRouter = require('./routes/outlookAuth.Routes');

app.use(bodyParser.json());
app.use(cors());

app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'any_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

// MessageRoutes
app.use('/', googleAuthRouter);
app.use('/api/mail', router);
// app.use("/outlook", outlookRouter);

app.get('/', async (req, res) => {
  res.redirect('https://documenter.getpostman.com/view/31971527/2sA35D43FE');
});

console.log(process.env.PORT);
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port http://localhost:${process.env.PORT}`);
});
