const Wallet = require("../models/wallet");

/* =========================
   INTERNAL HELPER
========================= */
const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }

  return wallet;
};

/* =========================
   GET WALLET
========================= */
exports.getWallet = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const wallet = await getOrCreateWallet(req.user.id);
   
     const sortedTransactions = [...(wallet.transactions || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      balance: wallet.balance || 0,
      transactions: wallet.transactions || []
    });

  } catch (error) {
    console.error("GET WALLET ERROR:", error);
    res.status(500).json({ message: "Failed to load wallet" });
  }
};


/* =========================
   DEBIT WALLET
========================= */
exports.debitWallet = async (userId, amount, reason = "Order payment") => {
  const wallet = await getOrCreateWallet(userId);

  const debitAmount = Number(amount);
  if (!debitAmount || debitAmount <= 0) {
    throw new Error("Invalid wallet debit amount");
  }

  if (wallet.balance < debitAmount) {
    throw new Error("Insufficient wallet balance");
  }

  wallet.balance -= debitAmount;
  wallet.transactions.push({
    amount: debitAmount,
    type: "debit",
    reason
  });

  await wallet.save();
};

/* =========================
   CREDIT WALLET
========================= */
exports.creditWallet = async (userId, amount, reason = "Refund") => {
  const wallet = await getOrCreateWallet(userId);

  const creditAmount = Number(amount);
  if (!creditAmount || creditAmount <= 0) {
    throw new Error("Invalid wallet credit amount");
  }

  wallet.balance += creditAmount;
  wallet.transactions.push({
    amount: creditAmount,
    type: "credit",
    reason
  });

  await wallet.save();
};
