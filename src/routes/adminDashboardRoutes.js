// routes/adminDashboardRoutes.js
const router = require("express").Router();
const { getDashboardData,generateWeeklyReportPDF } = require("../controllers/adminDashboardController");
const auth = require("../middlewares/authMiddleware");

router.get("/", auth,getDashboardData);
router.get("/weekly-report/pdf",auth,generateWeeklyReportPDF);

module.exports = router;
