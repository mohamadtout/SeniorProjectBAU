/*
METHODS IN THIS CONTROLLER:
1.register: takes: email, password, firstName, lastName, country (ISO 3166-1 alpha-2) AND phone in the body,
    performs password and phone number validation and registers the user
2.login: takes: email, password and a rememberMe boolean and logs in the user and returns a JWT token
3.getUserDetails: doesn't take anything (except the user token in the authorization header)
    and returns the logged in user's details
4.reviewGuide: takes: guideId, reviewScore and reviewText,
    writes a review of a guide by a user
4.reviewActivity: takes: activityId, reviewScore and reviewText,
    writes a review of an acitivity(trail or event) by a user
5.editReview: takes: reviewId, newScore, newText
    edits a certain review, wheather be it a guide review or an activity review
6.deleteReview: takes: reviewId
    deletes a certain review, wheather be it a guide review or an activity review
*/

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
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({ error: "Invalid email" });
        }
        const [rows] = await db.execute(`SELECT * FROM user WHERE email = ?`, [email]);
        if (rows.length > 0) {
            return res.status(400).json({ error: "Email already registered" });
        }
        if (country.length !== 2) {
            return res.status(400).json({ error: "Country Code must be 2 characters" });
        }
        if (isValidPhoneNumber(phone, country) !== true) {
            return res.status(400).json({ error: "Invalid phone number." });
        }
        //INCRYPT PASSWORD
        const hashedPassword = await bcrypt.hash(password, 10);
        //INSERTION
        await db.execute(
            `INSERT INTO
                user (u_id, email, f_name, l_name, country, phone, created_at, user_on)
                VALUES (NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), 0)
            `,
            [email, firstName, lastName, country, phone]
        );
        await db.execute(
            `
            SELECT
                u_id AS id
            FROM 
                user
            WHERE email = ?
            `,
            [email]
        );
        await db.execute(
            `
            INSERT INTO
                user_password (p_id, user_id, password, password_on)
            VALUES (NULL, ?, ?, 0)`,
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
        const [user] = await db.execute(
            `
            SELECT 
                u_id AS id 
            FROM 
                user 
            WHERE 
                email = ?`,
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
        if (rememberMe === true) {
            const token = jwt.sign({ userId: user[0].id }, process.env.JWT_SECRET, {
                expiresIn: "30d",
            });
            await db.execute(
                `
                INSERT INTO
                    user_session (us_id, user_id, jwt, expires_at)
                    VALUES (NULL, ?, ?, DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 30 DAY))`,
                [user[0].id, token]
            );
            return res.status(200).json({ token });
        } else {
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
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
const getUserDetails = async (req, res) => {
    const { userId } = req.body;
    try {
        if (!userId) {
            return res.status(401).json({ error: "Denied Access" });
        }
        const [data] = await db.execute(
            `
            SELECT
                email,
                f_name AS firstName,
                l_name AS lastName,
                country,
                phone
            FROM
                user
            WHERE 
                u_id = ?`,
            [userId]
        );
        return res.status(200).json({ user: data[0] });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
//TODO: make guide review only one per user
const reviewGuide = async (req, res) => {
    try {
        const { userId, guideId, reviewScore, reviewText } = req.body;
        const score = parseInt(reviewScore);
        if (!userId || !guideId || !reviewScore || !score) {
            return res.status(400).json({ message: "Missing required fields" });
        } else if (score > 100 || score < 0) {
            //OBFUSCATION OF CAUSE OF BAD REQUEST
            return res.status(400).json({ message: "Missing required fields" });
        } else {
            const [guideExists] = await db.execute(
                `SELECT
                    COUNT(*) AS count
                FROM 
                    guide 
                WHERE 
                    guide_on = 0
                    AND
                    g_id = ? `,
                [guideId]
            );
            if (guideExists[0].count !== 1) {
                //OBFUSCATION OF CAUSE OF BAD REQUEST
                return res.status(400).json({ message: "Missing required fields" });
            } else {
                const review = await db.execute(
                    `
                    INSERT INTO
                        review (r_id, user_id, rating, description, created_at, edited_at, review_on)
                        VALUES (NULL, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), 0)
                    `,
                    [userId, reviewScore, reviewText]
                );
                await db.execute(
                    `
                    INSERT INTO
                        guide_review (gr_id, guide_id, review_id)
                        VALUES (NULL, ?, ?)
                    `,
                    [guideId, review[0].insertId]
                );
                return res.status(200).json({ message: "Review Added Successfully" });
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
//TODO: make activity review only one per user
const reviewActivity = async (req, res) => {
    try {
        const { userId, activityId, reviewScore, reviewText } = req.body;
        const score = parseInt(reviewScore);
        if (!userId || !activityId || !reviewScore || !score) {
            return res.status(400).json({ message: "Missing required fields" });
        } else if (score > 100 || score < 0) {
            //OBFUSCATION OF CAUSE OF BAD REQUEST
            return res.status(400).json({ message: "Missing required fields" });
        } else {
            const [acitivityExists] = await db.execute(
                `SELECT
                    COUNT(*) AS count
                FROM
                    activity
                WHERE
                    a_id = ?`,
                [activityId]
            );
            if (acitivityExists[0].count !== 1) {
                //OBFUSCATION OF CAUSE OF BAD REQUEST
                return res.status(400).json({ message: "Missing required fields" });
            } else {
                const review = await db.execute(
                    `
                    INSERT INTO
                        review (r_id, user_id, rating, description, created_at, edited_at, review_on)
                        VALUES (NULL, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), 0)
                    `,
                    [userId, score, reviewText]
                );
                await db.execute(
                    `
                    INSERT INTO
                        activity_review (ar_id, activity_id, review_id)
                        VALUES (NULL, ?, ?)
                    `,
                    [activityId, review[0].insertId]
                );
                return res.status(200).json({ message: "Review Added Successfully" });
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
const editReview = async (req, res) => {
    try {
        const { userId, reviewId, newScore, newText } = req.body;
        const score = parseInt(newScore);
        if (!userId || !reviewId || !newScore || !score || score < 0 || score > 100) {
            return res.status(400).json({ message: "Missing required fields" });
        } else {
            const [reviewValid] = await db.execute(
                `
            SELECT
                COUNT(r_id) AS count
            FROM 
                review
            WHERE
                review_on = 0
                AND
                r_id = ?
                AND
                user_id = ?
            `,
                [reviewId, userId]
            );
            if (reviewValid[0].count !== 1) {
                //OBFUSCATION OF CAUSE OF BAD REQUEST
                return res.status(400).json({ message: "Missing required fields" });
            } else {
                await db.execute(
                    `
                UPDATE
                    review
                SET
                    rating = ?
                    AND
                    description = ?
                WHERE
                    r_id = ?
                    AND
                    user_id = ?
                    AND
                    review_on = 0
                `,
                    [score, newText, reviewId, userId]
                );
                return res.status(200).json({ message: "Edited Review Successfully" });
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
const deleteReview = async (req, res) => {
    try {
        const { userId, reviewId } = req.body;
        if (!userId || !reviewId) {
            return res.status(400).json({ message: "Missing required fields" });
        } else {
            const [reviewValid] = await db.execute(
                `
                SELECT
                    COUNT(*) AS count
                FROM
                    review
                WHERE
                    r_id = ?
                    AND user_id = ?
                    AND review_on = 0
                `,
                [reviewId, userId]
            );
            if (reviewValid[0].count !== 1) {
                //OBFUSCATION OF CAUSE OF BAD REQUEST
                return res.status(400).json({ message: "Missing required fields" });
            } else {
                await db.execute(
                    `
                UPDATE
                    review
                SET
                    review_on = 1
                WHERE
                    r_id = ?
                    AND user_id = ?
                    AND review_on = 0
                `,
                    [reviewId, userId]
                );
                return res.status(200).json({ message: "Deleted Review Successfully" });
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const getQuestion = async (req, res) => {
    try {
        const { step } = req.body;
        const [questions] = await db.execute(
            `
        SELECT
            q_id AS questionId,
            question_title AS question,
            multiple_answers,
            answer_has_image
        FROM 
            questionnaire
        WHERE
            question_on = 0
            AND
            step = ?
        `,
            [step]
        );
        if (questions.length === 0) {
            return res.status(400).json({ message: "No Questions Found For This Step" });
        } else {
            questions.forEach(async (question) => {
                const [answers] = await db.execute(
                    `
                SELECT
                    qa_id AS asnwerId,
                    answer_text AS answer,
                    answer_image_URL AS answerImage
                FROM
                    question_answer
                WHERE
                    question_id = ? AND answer_on = 0
                `,
                    [question.questionId]
                );
                question.push(answers);
            });
            return res.status(200).json({ questions });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const answerQuestion = async (req, res) => {
    const { userId, questionId, answerId } = req.body;
    try {
        if (!userId || !questionId || !answerId) {
            return res.status(400).json({ message: "Missing required fields" });
        } else {
            //Look if the provided question and answer ids are valid and compatible
            const answerValid = await db.execute(
                `
                SELECT
                    COUNT(qa_id) AS count
                FROM
                    question_answer
                WHERE
                    answer_on = 0
                    AND
                    question_id = ?
                    AND
                    qa_id = ? 
                `,
                [questionId, answerId]
            );
            if (answerValid.count != 1) {
                return res.status(400).json({ message: "Invalid Question or Answer Id" });
            } else {
                //delete any previous answer to the same question submitted by the user
                await db.execute(
                    `
                    UPDATE
                        user_question_answer
                    SET 
                        user_answer_on = 1
                    WHERE
                        user_id = ? AND question_id = ?
                    `,
                    [userId, questionId, answerId]
                );
                //record new answer
                await db.execute(
                    `
                INSERT INTO 
                    user_question_answer (uqa_id, user_id, question_id, answer_id, user_answer_on, created_at)
                    VALUES (NULL, ?, ?, ?, 0, CURRENT_TIMESTAMP())
                `,
                    [userId, questionId, answerId]
                );
                return res.status(200).json({ message: "Answer Recorded Successfully!" });
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
module.exports = {
    register,
    login,
    getUserDetails,
    reviewGuide,
    deleteReview,
    editReview,
    //TO TEST
    answerQuestion,
    reviewActivity,
};
