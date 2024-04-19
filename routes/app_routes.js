const express = require("express");
const router = express.Router();
const AppController = require("../controllers/app_controller");
const UserMiddleware = require("../middleware/user_middleware");

router.get("/headlines", UserMiddleware.verifyAgent, AppController.getHeadlines);
router.get("/images/:directory/:imageName", AppController.getImage);
router.get("/cities", UserMiddleware.verifyAgent, AppController.getCities);
router.get("/cities/:cityName", UserMiddleware.verifyAgent, AppController.getCityDetails);
router.get(
    "/guides/:firstName/:lastName",
    UserMiddleware.verifyAgent,
    AppController.getGuideDetails
);
router.get(
    "/guides/:firstName/:lastName/:guideOrder",
    UserMiddleware.verifyAgent,
    AppController.getGuideDetails
);
router.get("/trails", UserMiddleware.verifyAgent, AppController.getTrails);
router.get("/trails/:trailName", UserMiddleware.verifyAgent, AppController.getTrailDetails);
router.get("/events", UserMiddleware.verifyAgent, AppController.getEvents);
router.get("/events/:eventName", UserMiddleware.verifyAgent, AppController.getEventDetails);

module.exports = router;
