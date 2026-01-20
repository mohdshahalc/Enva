const express = require("express");
const router = express.Router();
const { createOffer,getAllOffers,disableOffer} = require("../controllers/offerController");


router.post("/", createOffer);
router.get("/", getAllOffers);
router.put("/:id/disable", disableOffer);


module.exports = router;
