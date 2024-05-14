const db = require("../database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const PORT = process.env.SERVER_PORT || 3000;
const imagesURL = process.env.API_URL + ":" + PORT + "/app/images/";
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        //VALIDATION
        if (!email || !password) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const [user] = await db.execute(
            `
            SELECT 
                u_id AS id 
            FROM 
                user 
            INNER JOIN 
                admin
            ON admin.user_id = user.u_id
            WHERE 
                email = ?
            `,
            [email]
        );
        if (user.length === 0) {
            return res.status(400).json({ error: "Invalid email or password" });
        }
        //AUTHENTICATION
        const [passwordRow] = await db.execute(
            `
            SELECT
                password
            FROM
                user_password
            WHERE
                password_on = 0
                AND
                user_id = ?`,
            [user[0].id]
        );
        const result = await bcrypt.compare(password, passwordRow[0].password);
        if (result == false) {
            return res.status(400).json({ error: "Invalid email or password" });
        }
        //JWT
        const token = jwt.sign({ userId: user[0].id }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });
        await db.execute(
            `
            INSERT INTO
                user_session (us_id, user_id, jwt, expires_at)
                VALUES (NULL, ?, ?, DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR))`,
            [user[0].id, token]
        );
        return res.status(200).json({ token });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Server error" });
    }
};
const getUsers = async (req, res) => {
    try {
        const [users] = await db.execute(
            `
            SELECT 
                u_id AS userId,
                f_name AS firstName,
                l_name AS lastName,
                email,
                user_on AS userOn,
            FROM
                user
            LEFT JOIN
                guide ON guide.user_id = user.u_id
            `
        );
        const [guides] = await db.execute(
            `
            SELECT 
                u_id AS userId,
                g_id AS guideId,
                f_name AS firstName,
                l_name AS lastName,
                email,
                user_on AS userOn,
                guide_on AS guideOn
            FROM
                guide
            INNER JOIN
                user ON user.u_id = guide.user_id
            `
        );
        return res.status(200).json({ users, guides });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Server error" });
    }
};
const updateUser = async (req, res) => {
    const { userId, userOn } = req.body;
    try {
        await db.execute(
            `
            UPDATE
                user
            SET
                user_on = ?
            WHERE
                u_id = ?
            `,
            [userOn, userId]
        );
        return res.status(200).json({ message: "User updated" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Server error" });
    }
};
const updateGuide = async (req, res) => {
    const { guideId, guideOn } = req.body;
    try {
        await db.execute(
            `
            UPDATE
                guide
            SET
                guide_on = ?
            WHERE
                g_id = ?
            `,
            [guideOn, guideId]
        );
        return res.status(200).json({ message: "Guide updated" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Server error" });
    }
};

module.exports = {
    //TO TEST
    login,
    getUsers,
    updateUser,
    updateGuide,
};
