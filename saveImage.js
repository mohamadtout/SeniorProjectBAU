const fs = require("fs");
const saveImage = (folderName, imageName, image) => {
    try {
        let matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches.length !== 3) new Error("Invalid base64 image URI");
        if(FileMimeType[matches[1]] === undefined) new Error("Invalid image type");
        let data = Buffer.from(matches[2], "base64");
        fs.writeFileSync(
            __dirname +
                `/images/${folderName}/${imageName}` +
                "." +
                FileMimeType[matches[1]],
            data
        );
        return FileMimeType[matches[1]];
    } catch (error) {
        throw error;
    }
};
module.exports = {
    saveImage,
};
const FileMimeType = {
    "image/bmp": "dib",
    "image/ief": "ief",
    "image/jpeg": "jpg",
    "image/x-macpaint": "pnt",
    "application/vnd.oasis.opendocument.image": "odi",
    "image/x-portable-bitmap": "pbm",
    "image/pict": "pict",
    "image/png": "png",
    "image/x-portable-anymap": "pnm",
    "image/x-portable-pixmap": "ppm",
    "image/vnd.adobe.photoshop": "psd",
    "image/x-quicktime": "qtif",
    "image/x-cmu-raster": "ras",
    "image/x-rgb": "rgb",
    "image/svg+xml": "svgz",
    "image/tiff": "tiff",
    "image/x-xbitmap": "xbm",
    "image/x-xpixmap": "xpm",
    "image/x-xwindowdump": "xwd",
    "image/vnd.wap.wbmp": "wbmp",
};
