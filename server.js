const cors = require("cors");
const express = require("express");
const app = express();
require("dotenv").config();
app.use(express.json({ limit: "50mb" }));
const user_routes = require("./routes/user_routes");
const app_routes = require("./routes/app_routes");
const guide_routes = require("./routes/guide_routes");
const admin_routes = require("./routes/admin_routes");
const PORT = process.env.SERVER_PORT || 3000;
const corsOptions = {
    origin: "*",
    credentials: true,
};
app.use(cors(corsOptions));
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
app.use("/api", user_routes);
app.use("/app", app_routes);
app.use("/guide", guide_routes);
app.use("/admin", admin_routes);
