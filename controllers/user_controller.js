const db = require("../database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { isValidPhoneNumber } = require("libphonenumber-js");

const register = async (req, res) => {
    const { email, password, firstName, lastName, country, phone } = req.body;
    try {
        //VALIDATION
        if (!email || !password || !firstName || !lastName || !country || !phone) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        } else if (password.length > 60) {
            return res.status(400).json({ error: "Password must be less than 60 characters" });
        } else if (!password.match(/[a-z]/g)) {
            return res.status(400).json({
                error: "Password must contain at least one lowercase letter",
            });
        } else if (!password.match(/[A-Z]/g)) {
            return res.status(400).json({
                error: "Password must contain at least one uppercase letter",
            });
        } else if (!password.match(/[0-9]/g)) {
            return res.status(400).json({ error: "Password must contain at least one number" });
        } else if (!password.match(/[^a-zA-Z\d]/g)) {
            return res.status(400).json({
                error: "Password must contain at least one special character",
            });
        }
        const [rows] = await db.execute(`SELECT * FROM user WHERE email = ?`, [email]);
        if (rows.length > 0) {
            return res.status(400).json({ error: "Email already registered" });
        }
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({ error: "Invalid email" });
        }
        if (country.length !== 2) {
            return res.status(400).json({ error: "Country must be 2 characters" });
        }
        if (isValidPhoneNumber(phone, country) !== true) {
            return res.status(400).json({ error: "Invalid phone number." });
        }
        //INCRYPT PASSWORD
        const hashedPassword = await bcrypt.hash(password, 10);
        //INSERTION
        await db.execute(
            `INSERT INTO user (u_id, email, f_name, l_name, country, phone, created_at, user_on) VALUES (NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), 0)`,
            [email, firstName, lastName, country, phone]
        );
        const [user] = await db.execute(`SELECT u_id AS id FROM user WHERE email = ?`, [email]);
        await db.execute(
            `INSERT INTO user_password (p_id, user_id, password, password_on) VALUES (NULL, ?, ?, 0)`,
            [user[0].id, hashedPassword]
        );
        return res.status(201).json({ message: "User created" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
const login = async (req, res) => {
    const { email, password, rememberMe } = req.body;
    try {
        //VALIDATION
        if (!email || !password || !rememberMe) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const [user] = await db.execute(`SELECT u_id AS id FROM user WHERE email = ?`, [email]);
        if (user.length === 0) {
            return res.status(400).json({ error: "Invalid email or password" });
        }
        //AUTHENTICATION
        const [passwordRow] = await db.execute(
            `SELECT password FROM user_password WHERE user_id = ? AND password_on = 0`,
            [user[0].id]
        );
        const result = await bcrypt.compare(password, passwordRow[0].password);
        if (result == false) {
            return res.status(400).json({ error: "Invalid email or password" });
        }
        //JWT
        console.log(process.env.JWT_SECRET)
        if (rememberMe === true) {
            const token = jwt.sign({ userId: user[0].id }, process.env.JWT_SECRET, {
                expiresIn: "30d",
            });
            await db.execute("INSERT INTO user_session (us_id, user_id, jwt, expires_at) VALUES (NULL, ?, ?, DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 30 DAY))", [user[0].id, token])
            return res.status(200).json({ token });
        } else {
            const token = jwt.sign({ userId: user[0].id }, process.env.JWT_SECRET, {
                expiresIn: "1h",
            });
            await db.execute("INSERT INTO user_session (us_id, user_id, jwt, expires_at) VALUES (NULL, ?, ?, DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR))", [user[0].id, token])
            return res.status(200).json({ token });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
const getUserDetails = async(req, res) => {
    const { userId } = req.body;
    try {
        if (!userId) {
            return res.status(401).json({ error: "Denied Access" });
        }
        const [data] = await db.execute(`SELECT email, f_name AS firstName, l_name AS lastName, country, phone FROM user WHERE u_id = ?`, [userId])
        return res.status(200).json({ user: data[0] });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
module.exports = {
    register,
    login,
    getUserDetails,
};
