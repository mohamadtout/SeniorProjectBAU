const express = require("express");
const router = express.Router();
const AppController = require("../controllers/app_controller");
const UserMiddleware = require("../middleware/user_middleware");

router.get("/headlines", UserMiddleware.verifyAgent, AppController.getHeadlines);
router.get("/images/:directory/:imageName", AppController.getImage);
router.get(
    "/cities",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySessionOptional,
    AppController.getCities
);
router.get("/cities/featured", UserMiddleware.verifyAgent, AppController.getFeaturedCities);
router.get(
    "/cities/:cityName",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySessionOptional,
    AppController.getCityDetails
);
router.get(
    "/guides",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySessionOptional,
    AppController.getGuides
);
router.get(
    "/guides/:firstName/:lastName",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySessionOptional,
    AppController.getGuideDetails
);
router.get(
    "/guides/:firstName/:lastName/:guideOrder",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySessionOptional,
    AppController.getGuideDetails
);
router.get(
    "/trails",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySessionOptional,
    AppController.getTrails
);
router.get(
    "/trails/:trailName",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySessionOptional,
    AppController.getTrailDetails
);
router.get(
    "/events",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySessionOptional,
    AppController.getEvents
);
router.get(
    "/events/:eventName",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySessionOptional,
    AppController.getEventDetails
);
router.get("/search/:query", UserMiddleware.verifyAgent, AppController.search);
module.exports = router;
