/*
1. login: logs in a guide and returns a jwt token
2. getTrails: returns all the trails related to a guide
3. getGuideProfile: returns the profile of a guide
3. editProfile: edits the profile of a guide
4. editTrail: edits the basic info of a trail
*/
const db = require("../database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const PORT = process.env.SERVER_PORT || 3000;
const imagesURL = process.env.API_URL + ":" + PORT + "/app/images/";
const { saveImage } = require("../saveImage");
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
                guide
            ON guide.user_id = user.u_id
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
            expiresIn: "1d",
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
        return res.status(500).json({ error: "Internal server error" });
    }
};
//Get Trails Related to Guide
const getTrails = async (req, res) => {
    const { guideId } = req.body;
    const [trails] = await db.execute(
        `
        SELECT
            activity.a_id AS activityId,
            activity.activity_title AS title,
            activity.description AS description,
            activity.price AS price,
            activity.preview_image_URL AS image
        FROM activity
        INNER JOIN
            activity_trail ON activity.a_id = activity_trail.activity_id
        WHERE
            type = 1
            AND
            activity_on = 0
            AND
            guide_id = ?
            AND
            activity_trail.ends_at > NOW()
        `,
        [guideId]
    );
    trails.forEach((trail) => {
        trail.image = imagesURL + "activities/" + trail.image;
    });
    return res.status(200).json(trails);
};
const getGuideProfile = async (req, res) => {
    try {
        const { guideId } = req.body;
        const [guide] = await db.execute(
            `
            SELECT
                user.f_name AS firstName,
                user.l_name AS lastName,
                bio,
                picture_URL as pic,
                cover_picture_URL as coverPic
            FROM
                guide
            INNER JOIN
                user ON guide.user_id = user.u_id
            WHERE
                g_id = ?
            `,
            [guideId]
        );
        guide[0].pic = imagesURL + "guides/" + guide[0].pic;
        guide[0].coverPic = imagesURL + "guides/" + guide[0].coverPic;
        return res.status(200).json({ guide: guide[0] });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
// Edit Guide Profile
const editProfile = async (req, res) => {
    try {
        const { guideId, bio, pic, coverPic } = req.body;
        if (!bio && !pic && !coverPic) {
            return res.status(400).json({ message: "Missing Parameters" });
        }
        const [guide] = await db.execute(
            `
            SELECT
                user.f_name AS firstName,
                user.l_name AS lastName
            FROM
                guide
            INNER JOIN
                user ON guide.user_id = user.u_id
            WHERE
                g_id = ?
            `,
            [guideId]
        );
        const guideName = guide[0].name;
        if (bio) {
            await db.execute(
                `
                UPDATE guide
                SET bio = ?
                WHERE g_id = ?
                `,
                [bio, guideId]
            );
        }
        if (pic) {
            var time = Date.now();
            var extension = saveImage("guides", `${guideName}-pic-${time}`, pic);
            await db.execute(
                `
                UPDATE guide
                SET picture_URL = ?
                WHERE g_id = ?
                `,
                [`${guideName}-pic-${time}.${extension}`, guideId]
            );
        }
        if (coverPic) {
            var time = Date.now();
            var extension = saveImage("guides", `${guideId}-coverPic`, coverPic);
            await db.execute(
                `
                UPDATE guide
                SET cover_picture_URL = ?
                WHERE g_id = ?
                `,
                [`${guideId}-coverPic.${extension}`, guideId]
            );
        }
        return res.status(200).json({ message: "Updated Successfully" });
    } catch (error) {
        if (
            error.message === "Invalid base64 image URI" ||
            error.message === "Invalid image type"
        ) {
            return res.status(400).json({ error: error.message });
        } else {
            console.log(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
};
//Edit Trail Basic Info
const editTrail = async (req, res) => {
    try {
        const { activityId, title, description, price, image } = req.body;
        if (!title && !description && !price && !image) {
            return res.status(400).json({ message: "Missing Parameters" });
        }
        if (title) {
            await db.execute(
                `
                UPDATE activity
                SET activity_title = ?
                WHERE a_id = ?
                `,
                [title, activityId]
            );
        } else {
            titleSearch = await db.execute(
                `
                SELECT activity_title
                FROM activity
                WHERE a_id = ?
                `,
                [activityId]
            );
            title = titleSearch[0].activity_title;
        }
        if (description) {
            await db.execute(
                `
                UPDATE activity
                SET description = ?
                WHERE a_id = ?
                `,
                [description, activityId]
            );
        }
        if (price && parseFloat(price) >= 0) {
            await db.execute(
                `
                UPDATE activity
                SET price = ?
                WHERE a_id = ?
                `,
                [price, activityId]
            );
        }
        if (image) {
            var time = Date.now();
            var extension = saveImage("activities", `${title}-${time}`, image);
            await db.execute(
                `
                UPDATE activity
                SET preview_image_URL = ?
                WHERE a_id = ?
                `,
                [`${title}-${time}.${extension}`, activityId]
            );
        }
        return res.status(200).json({ message: "Updated Successfully" });
    } catch (error) {
        if (
            error.message === "Invalid base64 image URI" ||
            error.message === "Invalid image type"
        ) {
            return res.status(400).json({ error: error.message });
        } else {
            console.log(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
};
module.exports = {
    login,
    getGuideProfile,
    editProfile,
    //TO TEST
    getTrails,
    editTrail,
};
