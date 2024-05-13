const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/admin_controller");
const AdminMiddleware = require("../middleware/admin_middleware");
module.exports = router;