const express = require("express");
const router = express.Router();
const AppController = require("../controllers/app_controller");
const UserMiddleware = require("../middleware/user_middleware");

router.get("/headlines", 
    UserMiddleware.verifyAgent,
    AppController.getHeadlines
)
router.get("/:directory/:imageName", 
    UserMiddleware.verifyAgent,
    AppController.getImage
)

module.exports = router;