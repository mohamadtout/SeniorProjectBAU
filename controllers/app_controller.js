/*
METHODS IN THIS CONTROLLER:
1.getHeadlines: doesn't take anything from the request, returns the headlines for the home page
2.getCities: doesn't take anything from the request, returns a sneak peak of each city present in the database
3.getCityDetails: takes the city name as a parameter, returns detailed information about a specific city
4.getGuidesForCity: helper function for the getCityDetails function, gets all the guides in a specific city
5.getGuideDetails: takes the guide's name as a parameter, returns detailed information about a specific guide
6.getEvents: doesn't take anything from the request, returns a sneak peak of all the future events present in the database
7.getEventDetails: takes the event name as a parameter, returns detailed information about a sepcific event
8.getTrails: doesn't take anything from the request, returns a sneak peak of all the future trails present in the database
9.getTrailDetails: takes the trail name as a parameter, returns detailed information about a sepcific trail
10.getGuideReviews: helper function used in the getGuideDetails function to get all the reviews of the guide and mark the one belonging to a potentially logged in user
11.getActivityReview: helper function used in both getEventDetails and getTrailDetails to get all the reviews of the event or trail and mark the one belonging to a potentially logged in user
12.getActivityTips: helper function used in both getEventDetails and getTrailDetails to get all the tips of the event or trail
13.getActivityCaracteristics: helper function used in both getEventDetails and getTrailDetails to get all the caracteristics of the event or trail
14.getImage: temporary development based function to serve images, this can be easily switched to a CDN in a production environment
15.getGuides: doesn't take anything from the request, returns a sneak peak of all the guides present in the database
16.search: takes a query as a parameter, returns all the results that match the query
17.searchGuides: helper function used in the search function to get all the guides that match the query
18.searchEvents: helper function used in the search function to get all the events that match the query
19.searchTrails: helper function used in the search function to get all the trails that match the query
20.searchCities: helper function used in the search function to get all the cities that match the query
21.getFeaturedCities: doesn't take anything from the request, returns a sneak peak of all the featured cities present in the database
*/
const db = require("../database");
const path = require("path");
const PORT = process.env.SERVER_PORT || 3000;
const imagesURL = process.env.API_URL + ":" + PORT + "/app/images/";
const getHeadlines = async (req, res) => {
    try {
        const [headlines] = await db.execute(
            `
            SELECT
                h_id AS headlineId,
                title,
                image_URL AS imageUrl,
                description,
                link
            FROM 
                headline`
        );
        headlines.forEach((headline) => {
            headline.imageUrl = imagesURL + "headlines/" + headline.imageUrl;
        });
        return res.status(200).json({ headlines });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getCities = async (req, res) => {
    const { userId } = req.body;
    let cities;
    try {
        if (userId) {
            [cities] = await db.execute(
                `SELECT
                c_id AS cityId,
                city_name AS title,
                city_description AS description,
                image_URL AS imageUrl,
                CASE WHEN ul.value = 1 THEN TRUE ELSE FALSE END AS likedByUser
            FROM 
                city
            LEFT JOIN 
                user_like ul ON city.c_id = ul.like_id AND ul.user_id = ?
            WHERE
            ul.type = 0 OR ul.type IS NULL
            `,
                [userId]
            );
        } else {
            [cities] = await db.execute(
                `SELECT
                c_id AS cityId,
                city_name AS title,
                city_description AS description,
                image_URL AS imageUrl
            FROM 
                city
            `
            );
        }
        cities.forEach((city) => {
            city.imageUrl = imagesURL + "cities/" + city.imageUrl;
        });
        return res.status(200).json({ cities });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getCityDetails = async (req, res) => {
    try {
        const { cityName } = req.params;
        const { userId } = req.body;
        let city;
        if (userId) {
            [city] = await db.execute(
                `
                SELECT
                    c_id AS cityId,
                    city_name AS title,
                    city_description AS description,
                    image_URL AS coverImage,
                    longitude,
                    latitude,
                    CASE WHEN ul.value = 1 THEN TRUE ELSE FALSE END AS likedByUser
                FROM 
                    city
                LEFT JOIN 
                    user_like ul ON city.c_id = ul.like_id AND ul.user_id = ?
                WHERE
                    city_name = ?
                    AND
                    (ul.type = 0 OR ul.type IS NULL)
                `,
                [userId, cityName]
            );
        } else {
            [city] = await db.execute(
                `
                SELECT
                    c_id AS cityId,
                    city_name AS title,
                    city_description AS description,
                    image_URL AS coverImage,
                    longitude,
                    latitude
                FROM 
                    city
                WHERE
                    city_name = ?
                `,
                [cityName]
            );
        }
        if (city.length === 0) {
            return res.status(200).json({ message: "No City Found" });
        } else {
            city[0].coverImage = imagesURL + "cities/" + city[0].coverImage;
            const [gallery] = await db.execute(
                `
                SELECT 
                    cg_id AS imageId,
                    title,
                    image_URL AS imageUrl
                FROM
                    city_gallery
                WHERE
                    city_id = ?
                    AND
                    image_on = 0
                `,
                [city[0].cityId]
            );
            if (gallery.length != 0) {
                gallery.forEach((image) => {
                    image.imageUrl = imagesURL + "cityGallery/" + image.imageUrl;
                });
            }
            const guides = await getGuidesForCity(city[0].cityId);
            return res.status(200).json({ city: city[0], gallery, guides });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getGuidesForCity = async (cityId) => {
    const [guides] = await db.execute(
        `
        SELECT
            g_id AS guideId,
            user.f_name AS firstName,
            user.l_name AS lastName,
            picture_URL as photo 
        FROM 
            guide
        INNER JOIN
            user ON user.u_id =  guide.user_id
        WHERE 
            guide_on = 0
            AND
            city_id = ?
        `,
        [cityId]
    );
    if (guides.length === 0) {
        return [];
    } else {
        for (const guide of guides) {
            guide.photo = imagesURL + "guides/" + guide.photo;
            const [categories] = await db.execute(
                `
                SELECT
                    category.category_name
                FROM
                    guide_category
                RIGHT JOIN
                    category ON guide_category.category_id = category.cat_id
                WHERE
                    guide_category.active = 0
                    AND
                    category.category_active = 0
                    AND
                    guide_category.guide_id = ?
                `,
                [guide.guideId]
            );
            guide.categories = categories.map((category) => category.category_name);
        }
        return guides;
    }
};
const getGuideDetails = async (req, res) => {
    try {
        const { firstName, lastName } = req.params;
        const { userId } = req.body;
        let guideExists;
        if (userId) {
            [guideExists] = await db.execute(
                `
                SELECT 
                    g_id AS guideId,
                    bio,
                    picture_URL AS image,
                    cover_picture_URL AS coverImage,
                    city_name AS cityName,
                    CASE WHEN ul.value = 1 THEN TRUE ELSE FALSE END AS likedByUser
                FROM 
                    guide
                INNER JOIN 
                    user ON user.u_id = guide.user_id
                INNER JOIN
                    city ON guide.city_id = city.c_id
                LEFT JOIN 
                    user_like ul ON guide.g_id = ul.like_id AND ul.user_id = ?
                WHERE 
                    guide_on = 0
                    AND user_on = 0
                    AND f_name = ?
                    AND l_name = ?
                    AND (ul.type = 2 OR ul.type IS NULL)
                `,
                [userId, firstName, lastName]
            );
        } else {
            [guideExists] = await db.execute(
                `
                SELECT 
                    g_id AS guideId,
                    bio,
                    picture_URL AS image,
                    cover_picture_URL AS coverImage,
                    city_name AS cityName 
                FROM 
                    guide
                INNER JOIN 
                    user ON user.u_id = guide.user_id
                INNER JOIN
                    city ON guide.city_id = city.c_id
                WHERE 
                    guide_on = 0
                    AND user_on = 0
                    AND f_name = ?
                    AND l_name = ?
                `,
                [firstName, lastName]
            );
        }
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
        guide.image = imagesURL + "guides/" + guide.image;
        guide.coverImage = imagesURL + "guides/" + guide.coverImage;
        //GET THE LANGUAGES OF THE GUIDE
        const [languages] = await db.execute(
            `
            SELECT 
                language_name AS language
            FROM 
                guide_language
            INNER JOIN
                language ON l_id = language_id
            WHERE
                guide_id = ?
                AND 
                active = 0
            `,
            [guide.guideId]
        );

        guide.languages = languages.map((language) => language.language);
        //GET THE CATEGORIES OF THE GUIDE
        guide.categories = await getGuideCategories(guide.guideId);
        const reviews = await getGuideReviews(guide.guideId, userId);
        guide.reviews = reviews;
        return res.status(200).json({ guide });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getGuideCategories = async (guideId) => {
    try {
        const [categories] = await db.execute(
            `
            SELECT 
                category.category_name
            FROM
                guide_category
            RIGHT JOIN 
                category ON guide_category.category_id = category.cat_id
            WHERE 
                guide_category.guide_id = ?
                AND 
                guide_category.active = 0
                AND 
                category.category_active = 0
            `,
            [guideId]
        );
        return categories.map((category) => category.category_name);
    } catch (error) {
        throw error;
    }
};
const getEvents = async (req, res) => {
    const { userId } = req.body;
    let events;
    if (userId) {
        [events] = await db.execute(
            `
            SELECT
                a_id AS eventId,
                activity_title AS title,
                preview_image_URL AS image,
                activity_event.time AS time,
                CASE WHEN ul.value = 1 THEN TRUE ELSE FALSE END AS likedByUser
            FROM activity
            INNER JOIN
                activity_event ON activity.a_id = activity_event.activity_id
            LEFT JOIN 
                user_like ul ON activity.a_id = ul.like_id AND ul.user_id = ?
            WHERE
                activity.type = 0
                AND
                activity_on = 0
                AND
                activity_event.time > NOW()
                AND
                (ul.type = 1 OR ul.type IS NULL)
            `,
            [userId]
        );
    } else {
        [events] = await db.execute(
            `
            SELECT
                a_id AS eventId,
                activity_title AS title,
                preview_image_URL AS image,
                activity_event.time AS time
            FROM activity
            INNER JOIN
                activity_event ON activity.a_id = activity_event.activity_id
            WHERE
                type = 0
                AND
                activity_on = 0
                AND
                activity_event.time > NOW()
            `
        );
    }
    events.forEach((event) => {
        event.image = imagesURL + "activities/" + event.image;
    });
    return res.status(200).json(events);
};
const getEventDetails = async (req, res) => {
    const { eventName } = req.params;
    const { userId } = req.body;
    let event;
    if (userId) {
        [event] = await db.execute(
            `
            SELECT
                a_id AS eventId,
                activity_title AS title,
                preview_image_URL AS image,
                description,
                price,
                activity_event.time AS time,
                CASE WHEN ul.value = 1 THEN TRUE ELSE FALSE END AS likedByUser
            FROM activity
            INNER JOIN
                activity_event ON activity.a_id = activity_event.activity_id
            LEFT JOIN 
                user_like ul ON activity.a_id = ul.like_id AND ul.user_id = ?
            WHERE
                activity.type = 0
                AND
                activity_on = 0
                AND
                activity_title = ?
                AND
                activity_event.time > NOW()
                AND
                (ul.type = 1 OR ul.type IS NULL)
            `,
            [userId, eventName]
        );
    } else {
        [event] = await db.execute(
            `
            SELECT
                a_id AS eventId,
                activity_title AS title,
                preview_image_URL AS image,
                description,
                price,
                activity_event.time AS time
            FROM activity
            INNER JOIN
                activity_event ON activity.a_id = activity_event.activity_id
            WHERE
                type = 0
                AND
                activity_on = 0
                AND
                activity_title = ?
                AND
                activity_event.time > NOW()
            `,
            [eventName]
        );
    }
    if (event.length === 0) {
        return res.status(200).json({ message: "Event Not Found" });
    }
    const [gallery] = await db.execute(
        `
        SELECT 
            ag_id AS imageId,
            image_URL AS imageUrl
        FROM
            activity_gallery
        WHERE
            activity_id = ?
            AND
            image_on = 0
        `,
        [event[0].eventId]
    );
    if (gallery.length != 0) {
        gallery.forEach((image) => {
            image.imageUrl = imagesURL + "activitiesGallery/" + image.imageUrl;
        });
    }
    const reviews = await getActivityReview(event[0].eventId, userId);
    const tips = await getActivityTips(event[0].eventId);
    const caracteristics = await getActivityCaracteristics(event[0].eventId);
    event[0].image = imagesURL + "activities/" + event[0].image;
    return res.status(200).json({ event: event[0], gallery, reviews, tips, caracteristics });
};
const getTrails = async (req, res) => {
    const { userId } = req.body;
    let trails;
    if (userId) {
        [trails] = await db.execute(
            `
            SELECT
                activity.a_id AS trailId,
                activity.activity_title AS title,
                activity.preview_image_URL AS image,
                activity_trail.starts_at AS startDate,
                activity_trail.ends_at AS endDate,
                guide.picture_URL AS guideImage,
                user.f_name AS guideFirstName,
                user.l_name AS guideLastName,
                CASE WHEN ul.value = 1 THEN TRUE ELSE FALSE END AS likedByUser
            FROM activity
            INNER JOIN
                activity_trail ON activity.a_id = activity_trail.activity_id
            INNER JOIN
                guide ON activity_trail.guide_id = guide.g_id
            INNER JOIN
                user ON guide.user_id = user.u_id
            LEFT JOIN 
                user_like ul ON activity.a_id = ul.like_id AND ul.user_id = ?
            WHERE
                activity.type = 1
                AND
                activity_on = 0
                AND
                guide_on = 0
                AND
                activity_trail.ends_at > NOW()
                AND
                (ul.type = 1 OR ul.type IS NULL)
            `,
            [userId]
        );
    } else {
        [trails] = await db.execute(
            `
            SELECT
                activity.a_id AS trailId,
                activity.activity_title AS title,
                activity.preview_image_URL AS image,
                activity_trail.starts_at AS startDate,
                activity_trail.ends_at AS endDate,
                guide.picture_URL AS guideImage,
                user.f_name AS guideFirstName,
                user.l_name AS guideLastName
            FROM activity
            INNER JOIN
                activity_trail ON activity.a_id = activity_trail.activity_id
            INNER JOIN
                guide ON activity_trail.guide_id = guide.g_id
            INNER JOIN
                user ON guide.user_id = user.u_id
            WHERE
                type = 1
                AND
                activity_on = 0
                AND
                guide_on = 0
                AND
                activity_trail.ends_at > NOW()
            `
        );
    }
    trails.forEach((trail) => {
        trail.guideImage = imagesURL + "guides/" + trail.guideImage;
        trail.image = imagesURL + "activities/" + trail.image;
    });
    return res.status(200).json(trails);
};
const getTrailDetails = async (req, res) => {
    try {
        const { trailName } = req.params;
        const { userId } = req.body;
        let trail;
        if (userId) {
            [trail] = await db.execute(
                `
            SELECT
                activity.a_id AS trailId,
                activity.activity_title AS title,
                activity.description AS description,
                activity.preview_image_URL AS image,
                activity.price AS price,
                activity_trail.starts_at AS startDate,
                activity_trail.ends_at AS endDate,
                guide.picture_URL AS guideImage,
                user.f_name AS guideFirstName,
                user.l_name AS guideLastName,
                CASE WHEN ul.value = 1 THEN TRUE ELSE FALSE END AS likedByUser
            FROM activity
            INNER JOIN
                activity_trail ON activity.a_id = activity_trail.activity_id
            INNER JOIN
                guide ON activity_trail.guide_id = guide.g_id
            INNER JOIN
                user ON guide.user_id = user.u_id
            LEFT JOIN 
                user_like ul ON activity.a_id = ul.like_id AND ul.user_id = ?
            WHERE
                activity.type = 1
                AND
                activity_on = 0
                AND
                guide_on = 0
                AND
                activity_trail.ends_at > NOW()
                AND
                activity.activity_title = ?
                AND
                (ul.type = 1 OR ul.type IS NULL)
            `,
                [userId, trailName]
            );
        } else {
            [trail] = await db.execute(
                `
            SELECT
                activity.a_id AS trailId,
                activity.activity_title AS title,
                activity.description AS description,
                activity.preview_image_URL AS image,
                activity.price AS price,
                activity_trail.starts_at AS startDate,
                activity_trail.ends_at AS endDate,
                guide.picture_URL AS guideImage,
                user.f_name AS guideFirstName,
                user.l_name AS guideLastName
            FROM activity
            INNER JOIN
                activity_trail ON activity.a_id = activity_trail.activity_id
            INNER JOIN
                guide ON activity_trail.guide_id = guide.g_id
            INNER JOIN
                user ON guide.user_id = user.u_id
            WHERE
                type = 1
                AND
                activity_on = 0
                AND
                guide_on = 0
                AND
                activity_trail.ends_at > NOW()
                AND
                activity.activity_title = ?
            `,
                [trailName]
            );
        }
        if (trail.length === 0) {
            return res.status(200).json({ message: "Trail Not Found" });
        }
        const [gallery] = await db.execute(
            `
        SELECT 
            ag_id AS imageId,
            image_URL AS imageUrl
        FROM
            activity_gallery
        WHERE
            activity_id = ?
            AND
            image_on = 0
        `,
            [trail[0].trailId]
        );
        if (gallery.length != 0) {
            gallery.forEach((image) => {
                image.imageUrl = imagesURL + "activitiesGallery/" + image.imageUrl;
            });
        }
        const reviews = await getActivityReview(trail[0].trailId, userId);
        const tips = await getActivityTips(trail[0].trailId);
        const caracteristics = await getActivityCaracteristics(trail[0].trailId);
        trail[0].guideImage = imagesURL + "guides/" + trail[0].guideImage;
        trail[0].image = imagesURL + "activities/" + trail[0].image;
        return res.status(200).json({ trail: trail[0], gallery, reviews, tips, caracteristics });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getGuideReviews = async (guideId, userId) => {
    //WHAT WE NEED: reviewScore, reviewText, reviewerName
    let reviews;
    if (!userId) {
        [reviews] = await db.execute(
            `
            SELECT
                review.rating AS reviewScore, 
                review.description AS reviewText, 
                user.f_name AS reviewerFirstName,
                user.l_name AS reviewerLastName,
                review.created_at AS reviewDate
            FROM 
                review
            INNER JOIN 
                guide_review ON review.r_id = guide_review.review_id
            INNER JOIN 
                user ON review.user_id = user.u_id
            WHERE 
                guide_review.guide_id = ?
                AND 
                review.review_on = 0
            `,
            [guideId]
        );
    } else {
        [reviews] = await db.execute(
            `
            SELECT
                review.rating AS reviewScore, 
                review.description AS reviewText, 
                user.f_name AS reviewerFirstName,
                user.l_name AS reviewerLastName,
                review.created_at AS reviewDate,
                CASE WHEN review.user_id = ? THEN TRUE ELSE FALSE END AS isCurrentUserReview
            FROM 
                review
            INNER JOIN 
                guide_review ON review.r_id = guide_review.review_id
            INNER JOIN 
                user ON review.user_id = user.u_id
            WHERE 
                guide_review.guide_id = ?
                AND 
                review.review_on = 0
            `,
            [userId, guideId]
        );
    }
    return reviews;
};
const getActivityTips = async (activityId) => {
    const [tips] = await db.execute(
        `
        SELECT
            tip.name AS name,
            tip.icon AS icon
        FROM
            tip
        INNER JOIN
            activity_tip ON tip.t_id = activity_tip.tip_id
        WHERE
            tip.active = 0
            AND
            activity_tip.active = 0
            AND
            activity_id = ?
        `,
        [activityId]
    );
    return tips;
};
const getActivityCaracteristics = async (activityId) => {
    const [caracteristics] = await db.execute(
        `
        SELECT
            caracteristic.name AS name,
            caracteristic.icon AS icon,
            activity_caracteristic.value AS value
        FROM
            caracteristic
        INNER JOIN
            activity_caracteristic ON caracteristic.ca_id = activity_caracteristic.actc_id
        WHERE
            caracteristic.active = 0
            AND
            activity_caracteristic.active = 0
            AND
            activity_caracteristic.activity_id = ?
        `,
        [activityId]
    );
    return caracteristics;
};
const getActivityReview = async (activityId, userId) => {
    //WHAT WE NEED: reviewScore, reviewText, reviewerName
    let reviews;
    if (!userId) {
        [reviews] = await db.execute(
            `
            SELECT
                review.rating AS reviewScore, 
                review.description AS reviewText, 
                user.f_name AS reviewerFirstName,
                user.l_name AS reviewerLastName,
                review.created_at AS reviewDate
            FROM 
                review
            INNER JOIN 
                activity_review ON review.r_id = activity_review.review_id
            INNER JOIN 
                user ON review.user_id = user.u_id
            WHERE 
                activity_review.activity_id = ?
                AND 
                review.review_on = 0
            `,
            [activityId]
        );
    } else {
        [reviews] = await db.execute(
            `
            SELECT
                review.rating AS reviewScore, 
                review.description AS reviewText, 
                user.f_name AS reviewerFirstName,
                user.l_name AS reviewerLastName,
                review.created_at AS reviewDate,
                CASE WHEN review.user_id = ? THEN TRUE ELSE FALSE END AS isCurrentUserReview
            FROM 
                review
            INNER JOIN 
                activity_review ON review.r_id = activity_review.review_id
            INNER JOIN 
                user ON review.user_id = user.u_id
            WHERE 
                activity_review.activity_id = ?
                AND 
                review.review_on = 0
            `,
            [userId, activityId]
        );
    }

    return reviews;
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
const getGuides = async (req, res) => {
    try {
        const { userId } = req.body;
        let guides;
        if (userId) {
            [guides] = await db.execute(
                `
                SELECT
                    g_id AS guideId,
                    user.f_name AS firstName,
                    user.l_name AS lastName,
                    picture_URL as photo,
                    city_name AS cityName,
                    CASE WHEN ul.value = 1 THEN TRUE ELSE FALSE END AS likedByUser
                FROM 
                    guide
                INNER JOIN
                    city ON guide.city_id = city.c_id
                INNER JOIN
                    user ON user.u_id =  guide.user_id
                LEFT JOIN 
                    user_like ul ON guide.g_id = ul.like_id AND ul.user_id = ?
                WHERE 
                    guide_on = 0
                    AND (ul.type = 2 OR ul.type IS NULL)
                `,
                [userId]
            );
        } else {
            [guides] = await db.execute(
                `
                SELECT
                    g_id AS guideId,
                    user.f_name AS firstName,
                    user.l_name AS lastName,
                    picture_URL as photo,
                    city_name AS cityName
                FROM 
                    guide
                INNER JOIN
                    city ON guide.city_id = city.c_id
                INNER JOIN
                    user ON user.u_id =  guide.user_id
                WHERE 
                    guide_on = 0
                `
            );
        }

        for (const guide of guides) {
            guide.photo = imagesURL + "guides/" + guide.photo;
            guide.categories = await getGuideCategories(guide.guideId);
        }
        return res.status(200).json({ guides });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const search = async (req, res) => {
    try {
        const { query } = req.params;
        const guides = await searchGuides(query);
        const events = await searchEvents(query);
        const trails = await searchTrails(query);
        const cities = await searchCities(query);
        return res.status(200).json({ guides, events, trails, cities });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const searchGuides = async (query) => {
    try {
        //contains, not exact match
        const [guides] = await db.execute(
            `
            SELECT
                g_id AS guideId,
                user.f_name AS firstName,
                user.l_name AS lastName,
                picture_URL as photo,
                city_name AS cityName
            FROM
                guide
            INNER JOIN
                city ON guide.city_id = city.c_id
            INNER JOIN
                user ON user.u_id =  guide.user_id 
            WHERE
                guide_on = 0
                AND
                CONCAT(user.f_name, ' ', user.l_name) LIKE ?
            `,
            [`%${query}%`]
        );
        for (const guide of guides) {
            guide.photo = imagesURL + "guides/" + guide.photo;
            guide.categories = await getGuideCategories(guide.guideId);
        }
        return guides;
    } catch (error) {
        throw error;
    }
};
const searchEvents = async (query) => {
    try {
        const [events] = await db.execute(
            `
            SELECT
                a_id AS eventId,
                activity_title AS title,
                preview_image_URL AS image,
                activity_event.time AS time
            FROM activity
            INNER JOIN
                activity_event ON activity.a_id = activity_event.activity_id
            WHERE
                type = 0
                AND
                activity_on = 0
                AND
                activity_event.time > NOW()
                AND
                activity_title LIKE ?
            `,
            [`%${query}%`]
        );
        events.forEach((event) => {
            event.image = imagesURL + "activities/" + event.image;
        });
        return events;
    } catch (error) {
        throw error;
    }
};
const searchTrails = async (query) => {
    try {
        const [trails] = await db.execute(
            `
            SELECT
                activity.a_id AS trailId,
                activity.activity_title AS title,
                activity.preview_image_URL AS image,
                activity_trail.starts_at AS startDate,
                activity_trail.ends_at AS endDate,
                guide.picture_URL AS guideImage,
                user.f_name AS guideFirstName,
                user.l_name AS guideLastName
            FROM activity
            INNER JOIN
                activity_trail ON activity.a_id = activity_trail.activity_id
            INNER JOIN
                guide ON activity_trail.guide_id = guide.g_id
            INNER JOIN
                user ON guide.user_id = user.u_id
            WHERE
                type = 1
                AND
                activity_on = 0
                AND
                guide_on = 0
                AND
                activity_trail.ends_at > NOW()
                AND
                activity.activity_title LIKE ?
            `,
            [`%${query}%`]
        );
        trails.forEach((trail) => {
            trail.guideImage = imagesURL + "guides/" + trail.guideImage;
            trail.image = imagesURL + "activities/" + trail.image;
        });
        return trails;
    } catch (error) {
        throw error;
    }
};
const searchCities = async (query) => {
    try {
        const [cities] = await db.execute(
            `SELECT
                c_id AS cityId,
                city_name AS title,
                city_description AS description,
                image_URL AS imageUrl
            FROM 
                city
            WHERE
                city_name LIKE ?
            `,
            [`%${query}%`]
        );
        cities.forEach((city) => {
            city.imageUrl = imagesURL + "cities/" + city.imageUrl;
        });
        return cities;
    } catch (error) {
        throw error;
    }
};
const getFeaturedCities = async (req, res) => {
    try {
        const [cities] = await db.execute(
            `SELECT
                c_id AS cityId,
                city_name AS title,
                city_description AS description,
                image_URL AS imageUrl
            FROM 
                city
            WHERE
                featured = 1
            `
        );
        cities.forEach((city) => {
            city.imageUrl = imagesURL + "cities/" + city.imageUrl;
        });
        return res.status(200).json({ cities });
    } catch (error) {
        throw error;
    }
};
module.exports = {
    getHeadlines,
    getImage,
    getCities,
    getCityDetails,
    getGuideDetails,
    getEvents,
    getTrails,
    getEventDetails,
    getTrailDetails,
    getGuides,
    search,
    getFeaturedCities,
};
