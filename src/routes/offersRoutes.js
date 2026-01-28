const express = require("express");
const router = express.Router();
const { createOffer,getAllOffers,disableOffer,getActiveOffer} = require("../controllers/offerController");
const auth = require("../middlewares/authMiddleware");

router.post("/",auth,createOffer);
router.get("/",auth,getAllOffers);
router.put("/:id/disable",auth,disableOffer);
router.get("/active", getActiveOffer);


module.exports = router;
