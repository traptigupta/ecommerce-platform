const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/upload");

/* ===============================
   🔹 CREATE PRODUCT
================================ */
router.post(
  "/",
  auth,
  adminAuth,
  upload.single("photo"),
  async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        quantity,
        category,
        isFeatured,
        variants,
      } = req.body;

      if (!name || !price || !category) {
        return res.status(400).json({
          message: "Name, price and category are required",
        });
      }

      let photo = "";
      let public_id = "";

      // ✅ Upload to Cloudinary (FIXED)
      if (req.file) {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });

        photo = result.secure_url;
        public_id = result.public_id;
      }

      const product = new Product({
        name,
        description,
        price,
        quantity,
        category,
        isFeatured,
        photo,
        public_id,
        variants: variants ? JSON.parse(variants) : [],
      });

      await product.save();

      res.status(201).json(product);
    } catch (err) {
      console.error("CREATE ERROR:", err);
      res.status(500).json({ message: "Create failed" });
    }
  }
);

/* ===============================
   🔹 GET ALL PRODUCTS
================================ */
router.get("/", auth, adminAuth, async (req, res) => {
  try {
    const products = await Product.find().populate("category");
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/* ===============================
   🔹 GET SINGLE PRODUCT
================================ */
router.get("/:id", auth, adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product" });
  }
});

/* ===============================
   🔹 UPDATE PRODUCT
================================ */
router.put(
  "/:id",
  auth,
  adminAuth,
  upload.single("photo"),
  async (req, res) => {
    try {
      let product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const {
        name,
        description,
        price,
        quantity,
        category,
        isFeatured,
        variants,
      } = req.body;

      // ✅ Update fields
      if (name) product.name = name;
      if (description) product.description = description;
      if (price) product.price = price;
      if (quantity) product.quantity = quantity;
      if (category) product.category = category;
      if (isFeatured !== undefined) product.isFeatured = isFeatured;

      // ✅ Upload new image (FIXED)
      if (req.file) {
        // 🔥 delete old image
        if (product.public_id) {
          await cloudinary.uploader.destroy(product.public_id);
        }

        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });

        product.photo = result.secure_url;
        product.public_id = result.public_id;
      }

      // ✅ Variants
      if (variants) {
        product.variants = JSON.parse(variants);
      }

      await product.save();

      res.json(product);
    } catch (err) {
      console.error("UPDATE ERROR:", err);
      res.status(500).json({ message: "Update failed" });
    }
  }
);

/* ===============================
   🔹 DELETE PRODUCT
================================ */
router.delete("/:id", auth, adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product?.public_id) {
      await cloudinary.uploader.destroy(product.public_id);
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Product delete failed" });
  }
});

module.exports = router;
