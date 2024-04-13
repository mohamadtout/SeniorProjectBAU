const express = require("express");
const router = express.Router();
const AppController = require("../controllers/app_controller");
const UserMiddleware = require("../middleware/user_middleware");

router.get("/headlines", UserMiddleware.verifyAgent, AppController.getHeadlines);
router.get("/images/:directory/:imageName", AppController.getImage);
router.get("/cities", UserMiddleware.verifyAgent, AppController.getCities);
router.get("/city/:cityName", UserMiddleware.verifyAgent, AppController.getCityDetails);
router.get(
    "/guide/:firstName/:lastName",
    UserMiddleware.verifyAgent,
    AppController.getGuideDetails
);
router.get(
    "/guide/:firstName/:lastName/:guideOrder",
    UserMiddleware.verifyAgent,
    AppController.getGuideDetails
);

module.exports = router;
