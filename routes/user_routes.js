const express = require("express");
const router = express.Router();
const UserController = require("../controllers/user_controller");
const UserMiddleware = require("../middleware/user_middleware");

router.post("/users/register", 
    UserMiddleware.verifyAgent,
    UserController.register
)

router.post("/users/login",
    UserMiddleware.verifyAgent,
    UserController.login
)
router.get("/user/details",
    UserMiddleware.verifyAgent,
    UserMiddleware.verifySession,
    UserController.getUserDetails
)

module.exports = router;