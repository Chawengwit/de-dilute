import { Router } from "express";

const router = Router();

// Public route: GET /api/products/public
router.get("/public", async (req, res) => {
  res.json([
    {
      id: 1,
      name: "De Dilute Lemon Soda",
      description: "น้ำมะนาวโซดาสดชื่น ซ่า ๆ",
      price: 2.99,
    },
    {
      id: 2,
      name: "De Dilute Peach Tea",
      description: "ชาพีชหวานหอม กลมกล่อม",
      price: 3.49,
    },
  ]);
});

export default router;
