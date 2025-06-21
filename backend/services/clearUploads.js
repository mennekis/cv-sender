const fs = require("fs");
const path = require("path");

const clearUploads = () => {
   const uploadDir = path.join(__dirname, "../uploads");
   if (fs.existsSync(uploadDir)) {
      fs.readdirSync(uploadDir).forEach((file) => {
         fs.unlinkSync(path.join(uploadDir, file));
      });
   }
};

module.exports = clearUploads;
