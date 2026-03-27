const Address = require("../models/address");

// GET ADDRESSES
exports.getAddresses = async (req, res) => {
  const addresses = await Address.find({ user: req.user.id });
  res.json(addresses);
};

// ADD ADDRESS
exports.addAddress = async (req, res) => {
  const address = new Address({
    user: req.user.id,
    ...req.body
  });

  await address.save();
  res.json({ message: "Address added", address });
};

// DELETE ADDRESS
exports.deleteAddress = async (req, res) => {
  await Address.deleteOne({
    _id: req.params.id,
    user: req.user.id
  });

  res.json({ message: "Address deleted" });
};


exports.setDefaultAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.user.id;

    // 1️⃣ Reset all addresses of this user
    await Address.updateMany(
      { user: userId },
      { $set: { isDefault: false } }
    );

    // 2️⃣ Set selected address as default
    await Address.updateOne(
      { _id: addressId, user: userId },
      { $set: { isDefault: true } }
    );

    // 3️⃣ Return updated addresses
    const addresses = await Address.find({ user: userId });

    res.json({
      message: "Default address updated",
      addresses
    });

  } catch (err) {
    console.error("SET DEFAULT ADDRESS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// UPDATE ADDRESS
exports.updateAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true }
    );

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.json({ message: "Address updated", address });
  } catch (err) {
    console.error("UPDATE ADDRESS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
