const db = require("../database");
const path = require("path");
const PORT = process.env.SERVER_PORT || 3000;
const imagesURL = process.env.API_URL + ":" + PORT;
const getHeadlines = async (req, res) => {
    try {
        const [headlines] = await db.execute(
            "SELECT h_id AS headlineId, title, image_URL AS imageUrl, description, link FROM headline"
        );
        headlines.forEach((headline) => {
            headline.imageUrl = imagesURL + "/app/images/headlines/" + headline.imageUrl;
        });
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
        cities.forEach((city) => {
            city.imageUrl = imagesURL + "/app/images/cities/" + city.imageUrl;
        });
        return res.status(200).json({ cities });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getGuidesDetails = async (cityId) => {
    const [guides] = await db.execute(
        `
    SELECT g_id AS guideId, CONCAT(user.f_name, '&', user.l_name) AS name, picture_URL as photo FROM guide
    INNER JOIN user ON user.u_id =  guide.user_id
    WHERE city_id = ? AND guide_on = 0
    `,
        [cityId]
    );
    if (guides.length === 0) {
        return [];
    } else {
        for (const guide of guides) {
            guide.photo = imagesURL + "/app/images/guides/" + guide.photo;
            const [categories] = await db.execute(
                `
                SELECT category.category_name
                FROM guide_category
                RIGHT JOIN category ON guide_category.category_id = category.cat_id
                WHERE guide_category.guide_id = ? AND guide_category.active = 0 AND category.category_active = 0
                `,
                [guide.guideId]
            );
            guide.categories = categories.map((category) => category.category_name);
        }
        return guides;
    }
};
const getCityDetails = async (req, res) => {
    try {
        const { cityName } = req.params;
        const [city] = await db.execute(
            "SELECT c_id AS cityId, city_name AS title, city_description AS description, image_URL AS coverImage, longitude, latitude FROM city WHERE city_name = ?",
            [cityName]
        );

        if (city.length === 0) {
            return res.status(200).json({ message: "No City Found" });
        } else {
            city[0].coverImage = imagesURL + "/app/images/cities/" + city[0].coverImage;
            const [gallery] = await db.execute(
                "SELECT cg_id AS imageId, title, image_URL AS imageUrl FROM city_gallery WHERE city_id = ? AND image_on = 0",
                [city[0].cityId]
            );
            if (gallery.length != 0) {
                gallery.forEach((image) => {
                    image.imageUrl = imagesURL + "/app/images/cityGallery/" + image.imageUrl;
                });
            }
            const guides = await getGuidesDetails(city[0].cityId);
            return res.status(200).json({ city: city[0], gallery, guides });
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
        const { firstName, lastName } = req.params;
        const [guideExists] = await db.execute(
            `
            SELECT g_id AS guideId, bio, picture_URL AS image, cover_picture_URL AS coverImage, city_name AS cityName FROM guide
            INNER JOIN user ON user.u_id = guide.user_id
            INNER JOIN city ON guide.city_id = city.c_id
            WHERE guide_on = 0 AND user_on = 0 AND f_name = ? AND l_name = ?
            `,
            [firstName, lastName]
        );
        let guide;
        if (guideExists.length == 0) {
            return res.status(200).json({ message: "Guide Not Found" });
        } else if (guideExists.length > 1) {
            const { guideOrder } = req.params;
            let guideIndex;
            if (!guideOrder || !parseInt(guide)) {
                guideIndex = 0;
            } else {
                guideIndex = parseInt(guideOrder) - 1;
            }
            guide = guideExists[guideIndex];
        } else {
            guide = guideExists[0];
        }
        //ADDING THE CDN URL TO THE IMAGES
        guide.image = imagesURL + "/app/images/guides/" + guide.image;
        guide.coverImage = imagesURL + "/app/images/guides/" + guide.coverImage;
        //GET THE LANGUAGES OF THE GUIDE
        const [languages] = await db.execute(
            `
            SELECT language_name AS language FROM guide_language
            INNER JOIN language ON l_id = language_id
            WHERE guide_id = ? AND active = 0
            `,
            [guide.guideId]
        );

        guide.languages = languages.map((language) => language.language);
        //GET THE CATEGORIES OF THE GUIDE
        const [categories] = await db.execute(
            `
            SELECT category.category_name
            FROM guide_category
            RIGHT JOIN category ON guide_category.category_id = category.cat_id
            WHERE guide_category.guide_id = ? AND guide_category.active = 0 AND category.category_active = 0
            `,
            [guide.guideId]
        );
        guide.categories = categories.map((category) => category.category_name);
        //TODO: GET THE REVIEWS OF THE GUIDE
        const reviews = await getGuideReviews(guide.guideId);
        guide.reviews = reviews;
        return res.status(200).json({ guide });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
//helper function for getting the guide details
const getGuideReviews = async (guideId) => {
    //WHAT WE NEED: reviewScore, reviewText, reviewerName
    let [reviews] = await db.execute(
        `
        SELECT rating AS reviewScore, user_id AS reviewerId, description AS reviewText FROM review
        INNER JOIN guide_review ON r_id = review_id
        WHERE guide_id = ? AND review_on = 0
        `,
        [guideId]
    );
    if (reviews.length === 0) {
        return [];
    } else {
        for (let review of reviews) {
            const [reviewer] = await db.execute(
                `
                SELECT CONCAT(user.f_name, '&', user.l_name) AS name FROM user
                WHERE u_id = ?
                `,
                [review.reviewerId]
            );
            review.reviewer = reviewer[0].name;
            delete review.reviewerId;
        }
        return reviews;
    }
};

module.exports = {
    getHeadlines,
    getImage,
    getCities,
    getCityDetails,
    //TO TEST
    getGuideDetails,
    getQuestion,
};
