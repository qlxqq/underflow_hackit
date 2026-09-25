const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Routes will be added here as your team builds features
// Example: app.use("/api/coach", require("./routes/codeSwitchCoach"));

module.exports = app;
