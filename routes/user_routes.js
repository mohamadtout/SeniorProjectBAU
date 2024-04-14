const express = require("express");
const router = express.Router();
const UserController = require("../controllers/user_controller");
const UserMiddleware = require("../middleware/user_middleware");

router.post("/users/register", UserMiddleware.verifyAgent, UserController.register);

router.post("/users/login", UserMiddleware.verifyAgent, UserController.login);
router.get(
    "/user/details",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySession,
    UserController.getUserDetails
);
router.post(
    "/user/guide/review",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySession,
    UserController.reviewGuide
);
router.post(
    "/user/activity/review",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySession,
    UserController.reviewActivity
);
router.post(
    "/user/review/delete",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySession,
    UserController.deleteReview
);
router.post(
    "/user/review/edit",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySession,
    UserController.editReview
);

module.exports = router;
