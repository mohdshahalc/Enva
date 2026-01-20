// routes/adminDashboardRoutes.js
const router = require("express").Router();
const { getDashboardData,generateWeeklyReportPDF } = require("../controllers/adminDashboardController");

router.get("/", getDashboardData);
router.get("/weekly-report/pdf", generateWeeklyReportPDF);

module.exports = router;
