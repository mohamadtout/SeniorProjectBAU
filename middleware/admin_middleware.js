/*
METHODS IN THIS MIDDLEWARE:
1.verifySessionAdmin: used in the methods in the admin_controller that require login, takes the token in the Authorization
*/

const db = require("../database");
const jwt = require("jsonwebtoken");
const verifySessionAdmin = async (req, res, next) => {
    try {
        const { userId, guideId } = req.body;
        const token = req.header("Authorization");
        if (!token || userId || guideId) {
            return res.status(401).json({ error: "Access denied" });
        } else {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const [user] = await db.execute(
                "SELECT admin.ad_id AS adminId FROM user INNER JOIN admin ON user.u_id = admin.user_id WHERE u_id = ? AND admin_on = 0",
                [decoded.userId]
            );
            if (user.length != 0) {
                req.body.userId = decoded.userId;
                req.body.adminId = user.adminId;
                next();
            } else {
                return res.status(401).json({ error: "Invalid token" });
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(401).json({ error: "Invalid token" });
    }
};
module.exports = {
    verifySessionAdmin,
};
