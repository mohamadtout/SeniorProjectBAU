const express = require("express");
const router = express.Router();
const GuideController = require("../controllers/guide_controller");
const GuideMiddleware = require("../middleware/guide_middleware");

router.post("/login", GuideController.login)
router.get("/profile", GuideMiddleware.verifySessionGuide, GuideController.getGuideProfile)
router.post("/profile/edit", GuideMiddleware.verifySessionGuide, GuideController.editProfile)
router.get("/trails", GuideMiddleware.verifySessionGuide, GuideController.getTrails);
router.post("/trails/edit", GuideMiddleware.verifySessionGuide, GuideMiddleware.verifyTrailToGuide, GuideController.editTrail);

module.exports = router;