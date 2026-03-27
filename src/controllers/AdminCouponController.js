const Coupon = require("../models/coupon");

exports.createCoupon = async (req, res) => {
  try {
    const {
  code,
  type,
  discountPercent,
  flatAmount,
  minPurchase,
  maxPurchase,
  usageLimit,
  startDate,
  endDate,
  description
} = req.body;


   // Normalize maxPurchase (empty = unlimited)
const parsedMaxPurchase =
  maxPurchase === "" || maxPurchase === undefined
    ? null
    : Number(maxPurchase);

    /* ======================
       REQUIRED FIELDS
    ====================== */
   if (
  !code ||
  !type ||
  minPurchase == null ||  
  usageLimit == null ||
  !startDate ||
  !endDate 
) {
  return res.status(400).json({
    message: "All required fields must be filled"
  });
}


    /* ======================
       VALIDATIONS
    ====================== */

    if (!/^[A-Z0-9]{4,20}$/.test(code)) {
      return res.status(400).json({
        message: "Coupon code must be 4–20 uppercase letters or numbers"
      });
    }

    if (type === "percentage") {
  if (discountPercent < 1 || discountPercent > 90) {
    return res.status(400).json({
      message: "Discount must be between 1% and 90%"
    });
  }
}

if (type === "flat") {
  if (!flatAmount || flatAmount <= 0) {
    return res.status(400).json({
      message: "Flat amount must be greater than 0"
    });
  }

  const requiredMin = flatAmount * 3;

  if (minPurchase < requiredMin) {
    return res.status(400).json({
      message: `For flat coupons, minimum purchase must be at least ₹${requiredMin}`
    });
  }
}


    if (usageLimit < 1) {
      return res.status(400).json({
        message: "Usage limit must be at least 1"
      });
    }

    if (minPurchase < 0) {
      return res.status(400).json({
        message: "Minimum purchase cannot be negative"
      });
    }

    if (type === "percentage" && parsedMaxPurchase <= minPurchase) {
  return res.status(400).json({
    message: "Max purchase must be greater than minimum purchase"
  });
}




    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (new Date(startDate) < today) {
      return res.status(400).json({
        message: "Start date cannot be in the past"
      });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        message: "End date must be after start date"
      });
    }

    const existing = await Coupon.findOne({ code });
    if (existing) {
      return res.status(409).json({
        message: "Coupon already exists"
      });
    }

   const coupon = await Coupon.create({
  code,
  type,
  discountPercent: type === "percentage" ? discountPercent : 0,
  flatAmount: type === "flat" ? flatAmount : 0,
  minPurchase,
  maxPurchase: type === "percentage" ? parsedMaxPurchase : null,
  usageLimit,
  startDate,
  endDate,
  description,
  isActive: true
});



    res.status(201).json({
      message: "Coupon created successfully",
      coupon
    });

  } catch (err) {
    console.error("CREATE COUPON ERROR:", err);
    res.status(500).json({
      message: "Server error"
    });
  }
};


exports.getAllCoupons = async (req, res) => {
  try {    
    const coupons = await Coupon.find().sort({ createdAt: -1 });  
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch coupons" });
  }
};

exports.deleteCoupon = async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ message: "Coupon deleted" });
};



exports.getCouponStats = async (req, res) => {
  try {
    const now = new Date();

    const coupons = await Coupon.find();

    const activeCoupons = coupons.filter(
      c => c.isActive && now >= c.startDate && now <= c.endDate
    ).length;

    const expiredCoupons = coupons.filter(
      c => now > c.endDate
    ).length;

    const maxDiscount =
      coupons.length > 0
        ? Math.max(
  ...coupons.map(c =>
    c.type === "percentage" ? c.discountPercent : 0
  )
)       : 0;

    // Used today (basic logic)
    const today = new Date().toDateString();
    const usedToday = coupons.reduce((total, c) => {
      const updatedToday =
        c.updatedAt && new Date(c.updatedAt).toDateString() === today;
      return updatedToday ? total + c.usedCount : total;
    }, 0);

    res.json({
      activeCoupons,
      expiredCoupons,
      maxDiscount,
      usedToday
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch coupon stats" });
  }
};


