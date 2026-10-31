
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const firebaseAuth = getAuth();

const privateKey = fs.readFileSync(
  path.join(__dirname, "keys", "private.pem"),
  "utf8"
);

const publicKey = fs.readFileSync(
  path.join(__dirname, "keys", "public.pem"),
  "utf8"
);

const app = express();

app.use(cors());
app.use(express.json({ limit: "20kb" }));

// Check server and Firestore connection
app.get("/health", async (req, res) => {
  try {
    await db.collection("users").limit(1).get();

    res.json({
      success: true,
      application: "MealSeal",
      backend: "running",
      firebase: "connected",
      firestore: "connected",
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      success: false,
      message: "Backend connection failed",
    });
  }
});

// Authentication middleware
async function requireAdmin(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Firebase authentication token required",
      });
    }

    const idToken = authorization.substring(7);
    const decoded = await firebaseAuth.verifyIdToken(idToken, true);

    const userDoc = await db.collection("users").doc(decoded.uid).get();

    if (
      !userDoc.exists ||
      userDoc.data()?.active !== true ||
      userDoc.data()?.role !== "CHARITY_ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Charity Admin access required",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Authentication failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}

// Create and digitally sign a voucher
app.post("/vouchers/create", requireAdmin, async (req, res) => {
  try {
    const {
      recipientRef,
      restaurantId,
      mealType,
      quantity,
      expiryDate,
    } = req.body || {};

    const recipient = typeof recipientRef === "string"
      ? recipientRef.trim()
      : "";

    const restaurant = typeof restaurantId === "string"
      ? restaurantId.trim()
      : "";

    const meals = ["Breakfast", "Lunch", "Dinner"];

    if (
      !recipient ||
      recipient.length > 100 ||
      !restaurant ||
      restaurant.length > 50 ||
      !meals.includes(mealType) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20 ||
      typeof expiryDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid voucher details",
      });
    }

    const [year, month, day] = expiryDate.split("-").map(Number);

    const parsedDate = new Date(
      Date.UTC(year, month - 1, day)
    );

    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry date",
      });
    }

    // Expiry is the end of the selected UTC calendar day.
    const expiresAt = Date.UTC(year, month - 1, day + 1);

    if (expiresAt <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Voucher expiry must be in the future",
      });
    }

    const voucherId = crypto.randomUUID();
    const issuedAt = Date.now();

    // Fixed field order creates a reproducible signed payload.
    const payload = {
      version: 1,
      voucherId,
      recipientRef: recipient,
      restaurantId: restaurant,
      mealType,
      quantity,
      issuedAt,
      expiresAt,
      issuerUid: req.user.uid,
    };

    const payloadString = JSON.stringify(payload);

    // ECDSA P-256 signature using SHA-256
    const signature = crypto.sign(
      "sha256",
      Buffer.from(payloadString, "utf8"),
      privateKey
    ).toString("base64url");

    const signedVoucher = {
      payload,
      signature,
      algorithm: "ES256",
      keyId: "mealseal-key-1",
    };

    // Verify the generated signature before storing.
    const signatureValid = crypto.verify(
      "sha256",
      Buffer.from(payloadString, "utf8"),
      publicKey,
      Buffer.from(signature, "base64url")
    );

    if (!signatureValid) {
      throw new Error("Generated signature verification failed");
    }

    await db.collection("vouchers").doc(voucherId).create({
      ...payload,
      signature,
      algorithm: "ES256",
      keyId: "mealseal-key-1",
      status: "ACTIVE",
      createdAt: FieldValue.serverTimestamp(),
      redeemedAt: null,
      redeemedBy: null,
    });

    return res.status(201).json({
      success: true,
      message: "Voucher digitally signed and created",
      voucherId,
      signedVoucher,
    });
  } catch (error) {
    console.error("Voucher creation failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create voucher",
    });
  }
});

// Public verification key (never exposes the private key)
app.get("/public-key", (req, res) => {
  res.json({
    algorithm: "ES256",
    keyId: "mealseal-key-1",
    publicKey,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MealSeal secure backend running on port ${PORT}`);
});
