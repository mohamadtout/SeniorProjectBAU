const db = require("../database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { isValidPhoneNumber } = require("libphonenumber-js");

const register = async (req, res) => {
    const { email, password, firstName, lastName, country, phone } = req.body;
    try {
        //VALIDATION
        if (
            !email ||
            !password ||
            !firstName ||
            !lastName ||
            !country ||
            !phone
        ) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        if (password.length < 8) {
            return res
                .status(400)
                .json({ error: "Password must be at least 8 characters" });
        } else if (password.length > 60) {
            return res
                .status(400)
                .json({ error: "Password must be less than 60 characters" });
        } else if (!password.match(/[a-z]/g)) {
            return res.status(400).json({
                error: "Password must contain at least one lowercase letter",
            });
        } else if (!password.match(/[A-Z]/g)) {
            return res.status(400).json({
                error: "Password must contain at least one uppercase letter",
            });
        } else if (!password.match(/[0-9]/g)) {
            return res
                .status(400)
                .json({ error: "Password must contain at least one number" });
        } else if (!password.match(/[^a-zA-Z\d]/g)) {
            return res.status(400).json({
                error: "Password must contain at least one special character",
            });
        }
        const [rows] = await db.execute(`SELECT * FROM users WHERE email = ?`, [
            email,
        ]);
        if (rows.length > 0) {
            return res.status(400).json({ error: "Email already registered" });
        }
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({ error: "Invalid email" });
        }
        if (country.length !== 2) {
            return res
                .status(400)
                .json({ error: "Country must be 2 characters" });
        }
        if(isValidPhoneNumber(phone, country)!== true){
            return res.status(400).json({error: "Invalid phone number."})
        }
        //INCRYPT PASSWORD
        const hashedPassword = await bcrypt.hash(password, 10);
        //INSERTION
        await db.execute(
            `INSERT INTO user (u_id, email, f_name, l_name, country, phone, created_at) VALUES (NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP())`,
            [email, firstName, lastName, country, phone]
        );
        const [user] = await db.execute(
            `SELECT u_id AS id FROM users WHERE email = ?`,
            [email]
        );
        await db.execute(
            `INSERT INTO user_password (p_id, user_id, password, password_on) VALUES (NULL, ?, ?, 0)`,
            [user.id, hashedPassword]
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
        const [rows] = await db.execute(`SELECT * FROM users WHERE email = ?`, [
            email,
        ]);
        if (rows.length === 0) {
            return res.status(400).json({ error: "Invalid email or password" });
        }
        //AUTHENTICATION
        const [passwordRow] = await db.execute(
            `SELECT password FROM user_password WHERE user_id = ? AND password_on = 0`,
            [user.id]
        );
        const result = await bcrypt.compare(password, passwordRow.password);
        if (!result) {
            return res.status(400).json({ error: "Invalid email or password" });
        }
        //JWT
        if (rememberMe === true) {
            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: "30d" }
            );
            return res.status(200).json({ token });
        } else {
            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );
            return res.status(200).json({ token });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
module.exports = {
    register,
    login,
};
