const express = require("express");
const app = express();
// const db = require("./database");
require("dotenv").config();
app.use(express.json());
const user_routes = require("./routes/user_routes");
const app_routes = require("./routes/app_routes");
const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
app.use("/api", user_routes);
app.use("/app", app_routes);