const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
  try {
    const {
      amount,
      shippingAddress,
      shippingMethod,
      shippingPrice
    } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (!req.user?.id && !req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: "ENVA Order Payment" },
            unit_amount: amount
          },
          quantity: 1
        }
      ],

      // 🔥 IMPORTANT: STORE EVERYTHING WEBHOOK NEEDS
      metadata: {
  type: "order",                 // 🔥 REQUIRED
  userId: String(req.user.id || req.user._id),

  amount: String(amount),        // 🔥 REQUIRED (Stripe source of truth)

  shippingAddress: JSON.stringify(shippingAddress),
  shippingMethod: shippingMethod || "standard",
  shippingPrice: String(shippingPrice || 15)
},

      success_url:
        "https://envastore.online/UI/checkout.html?payment=success",
      cancel_url:
        "https://envastore.online/UI/checkout.html?payment=cancel"
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("STRIPE SESSION ERROR:", err.message);
    res.status(500).json({
      message: "Unable to create Stripe session"
    });
  }
};


exports.createWalletTopupSession = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || amount < 100) {
      return res.status(400).json({ message: "Minimum ₹100 required" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "ENVA Wallet Top-up"
            },
            unit_amount: Math.round(amount * 100)
          },
          quantity: 1
        }
      ],

      metadata: {
        type: "wallet_topup",
        userId,
        amount
      },

      success_url: "https://envastore.online/UI/wallet.html?topup=success",
      cancel_url: "https://envastore.online/UI/wallet.html?topup=cancel"
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error("Wallet topup error:", err);
    res.status(500).json({ message: "Unable to start wallet top-up" });
  }
};

