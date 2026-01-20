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

    if (!name || !offerType || !discountPercent || !startDate || !endDate) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        message: "End date must be after start date"
      });
    }

    const offer = await Offer.create({
      name,
      offerType,
      discountPercent,
      product: offerType === "product" ? productId : null,
      category: offerType === "category" ? category : null,
      startDate,
      endDate
    });

    res.status(201).json({
      message: "Offer created successfully",
      offer
    });

  } catch (err) {
    console.error("CREATE OFFER ERROR:", err);
    res.status(500).json({ message: err.message });
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

