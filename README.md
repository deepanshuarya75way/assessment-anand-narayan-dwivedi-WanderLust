# WanderLust

A lodging listings app built with Express, MongoDB, Mongoose, EJS, and Bootstrap. Visitors can browse stays, create an account, and save listings they are interested in.

## Run locally

1. Install dependencies with `npm install`.
2. Start MongoDB locally at `mongodb://127.0.0.1:27017/wanderlust`.
3. Set `SESSION_SECRET` to a long random value. In PowerShell:

   ```powershell
   $env:SESSION_SECRET = "replace-with-a-long-random-value"
   ```

4. Start the app with `npm start` and open `http://localhost:8080/listings`.

## Project structure

```text
app.js                 Express app, routes, sessions, and authentication
models/                Mongoose listing, review, and user models
views/                 EJS pages and shared layout partials
public/                Static CSS and browser-side JavaScript
utils/                 Express error and async route helpers
init/                  Sample listing data and database initialization
schema.js              Joi request validation
```

Do not commit `.env`, session secrets, or `node_modules`.