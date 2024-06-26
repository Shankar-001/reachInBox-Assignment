# ReachInBox Assignment

## Backend

The assignment involves developing a server-based application using Node.js and Express that parses and checks emails in both Google and Outlook accounts. The application should respond to emails contextually using AI, leveraging packages like `@google/generative-ai` for AI functionalities, `googleapis` for Google APIs, `axios` for HTTP requests, and `bullMQ` for task scheduling.

# technologies used:

- Node.js
- Express.js
- @google/generative-ai
- Google APIs
- Microsoft Graph API

# npm packages used

- dotenv
- Axios
- bullMQ
- google-auth-library
- ioredis
- @microsoft/microsoft-graph-client

## Installation setup

1. Clone the repository to your local machine

```bash
git clone https://github.com/shraddha-gawde/reachInbox-assignment.git
```

2. Navigate to the root directory of the project directory :

```bash
cd backend
```

3. Run `npm install` to install all the dependencies
4. Create a `.env` file in the root directory with the same IDs as specified in the `.env.example`.

## Running the server

1. To start the server, run the following command in your terminal

```bash
npm run start
```

or

```bash
npm run dev
```

This will start the server at http://localhost:3000 (or whatever port you have specified in .env or index.js).

2. To start the pollGmail.js file, run the following command in your terminal

```bash
npm run poll
```

3. To start the server and pollGmail.js at cncurrent time, run the following command in your terminal

```bash
npm run start:both
```

## Running the Frontend

After Running the Server open index.html in your browser. Or Open your project folder in VS Code. In the Explorer pane, navigate to and open index.html with Live Server.
