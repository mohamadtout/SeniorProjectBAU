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
        const [cities] = await db.execute(
            "SELECT c_id AS cityId, city_name AS title, city_description AS description, image_URL AS imageUrl, longitude, latitude FROM city"
        );
        return res.status(200).json({ cities });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getCityDetails = async (req, res) => {
    try{
        const { cityId } = req.body;
        
    }catch(error){
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
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
