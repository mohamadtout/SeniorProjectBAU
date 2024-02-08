const db = require("../database");
const jwt = require("jsonwebtoken");
const verifySession = async (req, res, next) => {
    try {
        const token = req.header("Authorization");
        if (!token) {
            return res.status(401).json({ error: "Access denied" });
        } else {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.userId = decoded.userId;
            next();
        }
    } catch (error) {
        console.log(error);
        return res.status(401).json({ error: "Invalid token" });
    }
};
const verifyAgent = async (req, res, next) => {
    try {
        const client = req.header("User-Agent");
        if (!client) {
            return res.status(401).json({ error: "Access denied" });
        }
        if (
            client != "React App v1.0" ||
            client != "Flutter Android v1.0" ||
            client != "Flutter IOS v1.0"
        ) {
            return res.status(401).json({ error: "Access denied" });
        }
        next();
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
            `INSERT INTO user_log (l_id, request, endpoint, user_id, requested_at, agent) VALUES (NULL, ?, ?, ?, CURRET_TIMESTAMP(), ?)`,
            [
                JSON.stringify(req.body),
                JSON.stringify(req.originalUrl),
                userId,
                client,
            ]
        );
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
module.exports = {
    verifySession,
    verifyAgent,
    logRequest,
};
