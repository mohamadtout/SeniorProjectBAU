/*
METHODS IN THIS MIDDLEWARE:
1.verifySessionGuide: used in the methods in the guide_controller that require guide login through the guide portal, takes the token in the Authorization
    header and decodes it to get the userId of the currently logged in guide and puts it in the body
2.verifyTrailToGuide: used in the methods in the guide_controller that require access to a specific trail, checks if the guide has access to the trail
*/
const db = require("../database");
const jwt = require("jsonwebtoken");
const verifySessionGuide = async (req, res, next) => {
    try {
        const { userId, guideId } = req.body;
        const token = req.header("Authorization");
        if (!token || userId || guideId) {
            return res.status(401).json({ error: "Access denied" });
        } else {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const [user] = await db.execute(
                "SELECT guide.g_id AS guideId FROM user INNER JOIN guide ON user.u_id = guide.user_id WHERE u_id = ? AND guide_on = 0",
                [decoded.userId]
            );
            if (user.length != 0) {
                req.body.userId = decoded.userId;
                req.body.guideId = user[0].guideId;
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
const verifyTrailToGuide = async (req, res, next) => {
    try {
        const { guideId, activityId } = req.body;
        const [trail] = await db.execute(
            `
            SELECT COUNT(*) AS count
            FROM activity
            INNER JOIN activity_trail
            ON activity.a_id = activity_trail.activity_id
            WHERE a_id = ? AND guide_id = ?
            `,
            [guideId, activityId]
        );
        if (trail.count === 0) {
            return res.status(401).json({ error: "Unauthorized Access" });
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Invalid token" });
    }
};
module.exports = {
    verifySessionGuide,
    verifyTrailToGuide,
};
