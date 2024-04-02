const db = require("../database");
const path = require("path");
const getHeadlines = async (req, res) => {
    try {
        const [headlines] = await db.execute(
            "SELECT h_id AS headlineId, title, image_URL AS imageUrl, description, link FROM headline"
        );
        headlines.forEach(headline => {
            const PORT = process.env.SERVER_PORT || 3000;
            headline.imageUrl = process.env.API_URL+":"+PORT+"/app/images/headlines/"+headline.imageUrl
        })
        return res.status(200).json({ headlines });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getCities = async (req, res) => {
    try {
        const [cities] = await db.execute(
            "SELECT c_id AS cityId, city_name AS title, city_description AS description, image_URL AS imageUrl FROM city"
        );
        return res.status(200).json({ cities });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getGuidesDetails = async (cityId) => {
    const [guides] = await db.execute(
        `
    SELECT g_id AS guideId, user.f_name + user.l_name AS name, picture_URL as photo FROM guide
    INNER JOIN user ON user.u_id =  guide.user_id
    WHERE city_id = ? AND guide_on = 0
    `,
        [cityId]
    );
    if (guides.length === 0) {
        return [];
    } else {
        guides.forEach(async (guide) => {
            const [categories] = await db.execute(
                `
                SELECT category.category_name FROM guide_category
                INNER JOIN category ON guide_category.category_id = category.cat_id
                WHERE guide_category.guide_id = ? and guide_category.active = 0 AND category.category_active = 0
            `,
                [guide.guideId]
            );
            guide.push(categories);
        });
        return guides;
    }
};
const getCityDetails = async (req, res) => {
    try {
        const { cityName } = req.params;
        const [city] = await db.execute(
            "SELECT TOP 1 c_id AS cityId, city_name AS title, city_description AS description, image_URL AS coverImage, longitude, latitude FROM city WHERE city_name = ?",
            [cityName]
        );
        if (city.length === 0) {
            return res.status(200).json({ message: "No City Found" });
        } else {
            const [gallery] = await db.execute(
                "SELECT cg_id AS imageId, image_URL AS imageUrl FROM city_gallery WHERE city_id = ? AND image_on = 0",
                [city[0].cityId]
            );
            city.push(gallery);
            const guides = await getGuidesDetails(city[0].cityId);
            city.push(guides);
            return res.status(200).json({ city });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getImage = async (req, res) => {
    try {
        const { directory, imageName } = req.params;
        const dirPath = path.join(__dirname, `../images/${directory}`);
        res.sendFile(imageName, { root: dirPath }, (err) => {
            if (err) {
                // Handle errors such as file not found
                res.status(404).send("Image not found.");
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getQuestion = async (req, res) => {
    try {
        const { step } = req.body;
        const [questions] = await db.execute(
            `
        SELECT q_id AS questionId, question_title AS question, multiple_answers, answer_has_image
        FROM questionnaire
        WHERE step = ? AND question_on = 0
        `,
            [step]
        );
        if (questions.length === 0) {
            return res.status(400).json({ message: "No Questions Found For This Step" });
        } else {
            questions.forEach(async (question) => {
                const [answers] = await db.execute(
                    `
                SELECT qa_id AS asnwerId, answer_text AS answer, answer_image_URL AS answerImage FROM question_answer
                WHERE question_id = ? AND answer_on = 0
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
const getGuideDetails = async (req, res) => {
    try {
        const { guideName } = req.params;
        // Splitting the guideName into first name and last name
        const [firstName, lastName] = guideName.split("&").map((name) => name.trim());
        const [guideExists] = await db.execute(
            `
            SELECT g_id AS guideId, bio, picture_URL AS image, cover_picture_URL AS coverImage, city_name AS cityName,  FROM guide
            INNER JOIN user ON user.u_id = guide.user_id
            INNER JOIN city ON guide.city_id = city.c_id
            WHERE guide_on = 0 AND user_on = 0 AND f_name = ? AND l_name = ?
            `, [firstName, lastName]
        );
        //TODO: edge case, multiple guides with same name
        if (guideExists.length !== 1) {
            return res.status(200).json({ message: "Guide Not Found" });
        } else {
            //TODO: IMPLEMENT FUNCTION
            const languages = await db.execute(
                `
                SELECT language_name FROM 
                `
            )
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {
    //TO TEST
    getHeadlines,
    getImage,
    getCities,
    getCityDetails,
    getQuestion,
};
