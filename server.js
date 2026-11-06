/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const next = require("next");

const app = next({ dev: false });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(
      process.env.PORT || 3000,
    );
  })
  .catch((error) => {
    console.error("Failed to start the application:", error);
    process.exit(1);
  });
