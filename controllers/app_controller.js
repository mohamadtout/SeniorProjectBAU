const db = require("../database");
const path = require("path");
const getHeadlines = async (req, res) => {
    try {
        const [headlines] = await db.execute(
            "SELECT h_id AS headlineId, title, image_URL AS imageUrl, description, link FROM headline"
        );
        return res.status(200).json({ headlines });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getCities = async (req, res) => {
    try {
        const [headlines] = await db.execute(
            "SELECT h_id AS headlineId, title, image_URL AS imageUrl, description, link FROM headline"
        );
        return res.status(200).json({ headlines });
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

module.exports = {
    getHeadlines,
    getImage
};
