const Order = require("../models/order");
const User = require("../models/user");
const PDFDocument = require("pdfkit");


exports.getDashboardData = async (req, res) => {
  try {
  const orders = await Order.find()
  .populate("user", "name email")
  .populate("items.product", "name images");

    /* ======================
       KPIs
    ====================== */
    const totalOrders = orders.length;

    const totalSales = orders
      .filter(o => !["cancelled", "returned"].includes(o.status))
      .reduce((sum, o) => sum + o.total, 0);

    const pendingOrders = orders.filter(o => o.status === "pending").length;
    const cancelledOrders = orders.filter(o => o.status === "cancelled").length;

    /* ======================
       QUICK STATS (backend-controlled)
    ====================== */
    // 👉 Later replace these with analytics
    const visitorsToday = 1200 + Math.floor(Math.random() * 200);

    const conversionRate = visitorsToday
      ? ((totalOrders / visitorsToday) * 100).toFixed(2)
      : 0;

    const bounceRate = 35 + Math.floor(Math.random() * 10);

    /* ======================
       WEEKLY SALES
    ====================== */
    const weeklySales = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const dailyTotal = orders
        .filter(o => {
          const od = new Date(o.createdAt);
          return od.toDateString() === d.toDateString()
            && !["cancelled", "returned"].includes(o.status);
        })
        .reduce((sum, o) => sum + o.total, 0);

      weeklySales.push({
        day: d.toLocaleDateString("en-IN", { weekday: "short" }),
        total: dailyTotal
      });
    }

    /* ======================
   WEEKLY REPORT SUMMARY
====================== */
const lastWeekOrders = orders.filter(o => {
  const d = new Date(o.createdAt);
  const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 7 && !["cancelled", "returned"].includes(o.status);
});

const weeklySalesAmount = lastWeekOrders.reduce(
  (sum, o) => sum + o.total,
  0
);

const weeklyOrdersCount = lastWeekOrders.length;

// Fake growth for now (replace later)
const weeklyGrowthRate = weeklyOrdersCount
  ? ((weeklyOrdersCount / 7) * 3).toFixed(1)
  : 0;


    /* ======================
       RECENT ORDERS
    ====================== */
   const recentOrders = orders
  .sort((a, b) => b.createdAt - a.createdAt)
  .slice(0, 5)
  .map(o => ({
    orderNo: `#ORD-${o._id.toString().slice(-6).toUpperCase()}`,
    customer: o.user?.email || "Guest",
    date: o.createdAt,
    status: o.status,
    total: o.total
  }));

  /* ======================
   TOP PRODUCTS (Last 7 Days)
====================== */
const last7Days = new Date();
last7Days.setDate(last7Days.getDate() - 7);

const topProductsMap = {};

orders.forEach(order => {
  if (
    order.createdAt >= last7Days &&
    !["cancelled", "returned"].includes(order.status)
  ) {
    order.items.forEach(item => {
      if (!item.product) return;

      const pid = item.product._id.toString();

      if (!topProductsMap[pid]) {
        topProductsMap[pid] = {
          productId: pid,
          name: item.product.name,                 // ✅ REAL NAME
          image: item.product.images?.[0] || null, // ✅ REAL IMAGE
          qty: 0,
          revenue: 0
        };
      }

      topProductsMap[pid].qty += item.quantity;
      topProductsMap[pid].revenue += item.price * item.quantity;
    });
  }
});

const topProducts = Object.values(topProductsMap)
  .sort((a, b) => b.qty - a.qty)
  .slice(0, 3);


    /* ======================
       RESPONSE (MATCHES FRONTEND)
    ====================== */
    res.json({
      kpis: {
        totalOrders,
        totalSales,
        pendingOrders,
        cancelledOrders
      },weeklyReport: {
  weeklySalesAmount,
  weeklyOrdersCount,
  weeklyGrowthRate
},
      quickStats: {
        visitorsToday,
        conversionRate,
        bounceRate
      },
      weeklySales,
      recentOrders,
      topProducts
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dashboard load failed" });
  }
};

exports.generateWeeklyReportPDF = async (req, res) => {
  try {
    const orders = await Order.find().populate("user", "email");

    const today = new Date();

    const lastWeekOrders = orders.filter(o => {
      const diff =
        (today - new Date(o.createdAt)) / (1000 * 60 * 60 * 24);
      return diff <= 7 && !["cancelled", "returned"].includes(o.status);
    });

    const totalSales = lastWeekOrders.reduce((s, o) => s + o.total, 0);
    const totalOrders = lastWeekOrders.length;

    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=ENVA_Weekly_Sales_Report.pdf"
    );

    doc.pipe(res);

    /* ======================
       HEADER
    ====================== */
    doc.font("Helvetica-Bold").fontSize(26).text("ENVA", { align: "center" });
    doc.font("Helvetica").fontSize(13).text("Weekly Sales Report", { align: "center" });

    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1.5);

    /* ======================
       SUMMARY
    ====================== */
    doc.font("Helvetica-Bold").fontSize(15).text("Summary");
    doc.moveDown(0.6);

    doc.font("Helvetica").fontSize(11);
    doc.text(`Report Period     : Last 7 Days`);
    doc.text(`Total Orders      : ${totalOrders}`);
    doc.text(`Total Revenue     : ₹ ${totalSales.toLocaleString("en-IN")}`);
    doc.text(`Generated On      : ${new Date().toLocaleString("en-IN")}`);

    doc.moveDown(1.8);

    /* ======================
       TABLE SETUP
    ====================== */
    doc.font("Helvetica-Bold").fontSize(14).text("Order Details");
    doc.moveDown(0.8);

    const startY = doc.y;
    const rowHeight = 22;

    const col = {
      order: 40,
      customer: 130,
      date: 300,
      status: 380,
      amount: 470
    };

    /* TABLE HEADER */
    doc.fontSize(11);
    doc.text("Order ID", col.order, startY);
    doc.text("Customer", col.customer, startY);
    doc.text("Date", col.date, startY);
    doc.text("Status", col.status, startY);
    doc.text("Amount", col.amount, startY, { width: 80, align: "right" });

    doc.moveTo(40, startY + 16).lineTo(555, startY + 16).stroke();

    let y = startY + rowHeight;

    /* ======================
       TABLE ROWS
    ====================== */
    doc.font("Helvetica").fontSize(10);

    lastWeekOrders.forEach(o => {
      if (y > 750) {
        doc.addPage();
        y = 60;
      }

      doc.text(
        `#${o._id.toString().slice(-6).toUpperCase()}`,
        col.order,
        y
      );

      doc.text(
        o.user?.email || "Guest",
        col.customer,
        y,
        { width: 160 }
      );

      doc.text(
        new Date(o.createdAt).toLocaleDateString("en-IN"),
        col.date,
        y
      );

      doc.text(
        o.status.toUpperCase(),
        col.status,
        y
      );

      doc.text(
        `₹ ${o.total.toLocaleString("en-IN")}`,
        col.amount,
        y,
        { width: 80, align: "right" }
      );

      y += rowHeight;
    });

    /* ======================
       FOOTER
    ====================== */
    doc.fontSize(9)
      .fillColor("gray")
      .text(
        "This report is system generated by ENVA Admin Dashboard.",
        40,
        800,
        { width: 515, align: "center" }
      );

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
};
