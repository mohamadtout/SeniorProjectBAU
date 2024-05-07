/*
METHODS IN THIS MIDDLEWARE:
1.verifySession: used in the methods in the user_controller that require login, takes the token in the Authorization
    header and decodes it to get the userId of the currently logged in user and puts it in the body
2.verifySessionOptional: used in the methods in the user_controller that can benefit from and utilize a login, takes the token in the Authorization
    header and decodes it to get the userId of the currently logged in user and puts it in the body
3.verifyAgent: used in version control/support (sepcifically on mobile development) so that older versions
    can be brought out of support from the server side
4.logRequest: logs the current request performed by a logged in user in the database
    this is to identify potential "bad-faith" behavior through a future admin dashboard
*/

const db = require("../database");
const jwt = require("jsonwebtoken");
const verifySession = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const token = req.header("Authorization");
        if (!token || userId) {
            return res.status(401).json({ error: "Access denied" });
        } else {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const [user] = await db.execute("SELECT u_id FROM user WHERE u_id = ? AND user_on = 0", [
                decoded.userId,
            ]);
            if (user.length != 0) {
                req.body.userId = decoded.userId;
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
const verifySessionOptional = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const token = req.header("Authorization");
        if (!token || userId) {
            next();
        } else {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const [user] = await db.execute("SELECT u_id FROM user WHERE u_id = ? AND user_on = 0", [
                decoded.userId,
            ]);
            if (user.length != 0) {
                req.body.userId = decoded.userId;
                next();
            } else {
                return res.status(401).json({ error: "Invalid token" });
            }
        }
    } catch (error) {
        console.log(error);
        next();
    }
};
const verifyAgent = async (req, res, next) => {
    try {
        const client = req.header("User-Agent");
        if (!client) {
            return res.status(401).json({ error: "Access denied" });
        }
        if (
            client.startsWith("Flutter") &&
            !(client === "Flutter Android v1.0" || client === "Flutter IOS v1.0")
        ) {
            return res.status(401).json({ error: "Access denied" });
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
        return res.status(401).json({ error: "Invalid token" });
    }
};
const logRequest = async (req, res, next) => {
    try {
        const client = req.header("User-Agent");
        const { userId } = req.body;
        await db.execute(
            `INSERT INTO user_log (l_id, request, endpoint, user_id, requested_at, agent) VALUES (NULL, ?, ?, ?, CURRENT_TIMESTAMP(), ?)`,
            [JSON.stringify(req.body), JSON.stringify(req.originalUrl), userId, client]
        );
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
module.exports = {
    verifySession,
    verifySessionOptional,
    verifyAgent,
    logRequest,
};
