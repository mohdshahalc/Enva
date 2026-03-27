<<<<<<< HEAD
require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

app.get("/api", (req, res) => {
  res.json({
    status: "OK",
    message: "Enva API running 🚀"
  });
});


connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
=======
require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
>>>>>>> cff120e6b16b68d733c2ecd5a28269a957beb8b6
