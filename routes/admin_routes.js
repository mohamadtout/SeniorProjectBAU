const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/admin_controller");
const AdminMiddleware = require("../middleware/admin_middleware");

router.post("/login", AdminController.login);
router.get("/users", AdminMiddleware.verifySessionAdmin, AdminController.getUsers);
router.post("/users/toggle-user", AdminMiddleware.verifySessionAdmin, AdminController.updateUser);
router.post("/users/toggle-guide", AdminMiddleware.verifySessionAdmin, AdminController.updateGuide);
router.get("/cities", AdminMiddleware.verifySessionAdmin, AdminController.getCities);
router.post("/cities/feature", AdminMiddleware.verifySessionAdmin, AdminController.featureCity);
router.get("/caracteristics", AdminMiddleware.verifySessionAdmin, AdminController.getCaracteristics);
router.post("/caracteristics/toggle", AdminMiddleware.verifySessionAdmin, AdminController.updateCaracteristic);
module.exports = router;
