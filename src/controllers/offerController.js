const Offer = require("../models/offer");
const Product = require("../models/product");

exports.createOffer = async (req, res) => {
  try {
    const {
      name,
      offerType,
      discountPercent,
      productId,
      category,
      startDate,
      endDate
    } = req.body;

    /* ---------- BASIC REQUIRED FIELDS ---------- */
    if (!name || !offerType || !discountPercent || !startDate || !endDate) {
      return res.status(400).json({
        message: "All required fields must be provided"
      });
    }

    /* ---------- OFFER NAME VALIDATION ---------- */
    const nameRegex = /^[A-Za-z\s\-&]+$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({
        message: "Offer name should contain only letters and spaces"
      });
    }

    if (name.trim().length < 3) {
      return res.status(400).json({
        message: "Offer name must be at least 3 characters long"
      });
    }

    /* ---------- DISCOUNT VALIDATION ---------- */
    if (
      isNaN(discountPercent) ||
      discountPercent <= 0 ||
      discountPercent > 90
    ) {
      return res.status(400).json({
        message: "Discount must be between 1% and 90%"
      });
    }

    /* ---------- OFFER TYPE VALIDATION ---------- */
    if (!["product", "category"].includes(offerType)) {
      return res.status(400).json({
        message: "Invalid offer type"
      });
    }

    if (offerType === "product" && !productId) {
      return res.status(400).json({
        message: "Product must be selected for product offer"
      });
    }

    if (offerType === "category" && !category) {
      return res.status(400).json({
        message: "Category must be selected for category offer"
      });
    }

    /* ---------- DATE VALIDATION ---------- */
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({
        message: "Invalid date format"
      });
    }

    if (start >= end) {
      return res.status(400).json({
        message: "End date must be after start date"
      });
    }

    // 🚫 Prevent expired or past offers
    if (end <= now) {
      return res.status(400).json({
        message: "End date must be in the future"
      });
    }

    if (start < now) {
      return res.status(400).json({
        message: "Start date cannot be in the past"
      });
    }

    /* ---------- CREATE OFFER ---------- */
    const offer = await Offer.create({
      name: name
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase()), // professional format
      offerType,
      discountPercent,
      product: offerType === "product" ? productId : null,
      category: offerType === "category" ? category : null,
      startDate: start,
      endDate: end,
      isActive: true
    });

    res.status(201).json({
      message: "Offer created successfully",
      offer
    });

  } catch (err) {
    console.error("CREATE OFFER ERROR:", err);
    res.status(500).json({
      message: "Server error while creating offer"
    });
  }
};


exports.getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate("product", "name sku")
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json(offers);
  } catch (err) {
    console.error("GET OFFERS ERROR:", err);
    res.status(500).json({ message: "Failed to load offers" });
  }
};

exports.disableOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    offer.isActive = false;
    await offer.save();

    res.json({ message: "Offer disabled successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to disable offer" });
  }
};

exports.getActiveOffer = async (req, res) => {
  try {
    const now = new Date();

    const offer = await Offer.findOne({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).sort({ createdAt: -1 });

    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch active offer" });
  }
};
