
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  initializeApp,
  getApps,
  cert,
} = require("firebase-admin/app");

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

const { getAuth } = require("firebase-admin/auth");

const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

const PORT = Number(process.env.PORT) || 3000;

const serviceAccount = require("./serviceAccountKey.json");

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

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

const ALGORITHM = "ES256";
const KEY_ID = "mealseal-key-1";

const PAYLOAD_FIELDS = [
  "version",
  "voucherId",
  "recipientRef",
  "restaurantId",
  "mealType",
  "quantity",
  "issuedAt",
  "expiresAt",
  "issuerUid",
];

function buildPayload(data) {
  return {
    version: data.version,
    voucherId: data.voucherId,
    recipientRef: data.recipientRef,
    restaurantId: data.restaurantId,
    mealType: data.mealType,
    quantity: data.quantity,
    issuedAt: data.issuedAt,
    expiresAt: data.expiresAt,
    issuerUid: data.issuerUid,
  };
}

function isValidPayload(payload) {
  return (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    Object.keys(payload).length === PAYLOAD_FIELDS.length &&
    PAYLOAD_FIELDS.every((field) =>
      Object.prototype.hasOwnProperty.call(payload, field)
    ) &&
    payload.version === 1 &&
    typeof payload.voucherId === "string" &&
    payload.voucherId.length > 0 &&
    typeof payload.recipientRef === "string" &&
    payload.recipientRef.length > 0 &&
    typeof payload.restaurantId === "string" &&
    payload.restaurantId.length > 0 &&
    ["Breakfast", "Lunch", "Dinner"].includes(
      payload.mealType
    ) &&
    Number.isInteger(payload.quantity) &&
    payload.quantity >= 1 &&
    payload.quantity <= 20 &&
    Number.isSafeInteger(payload.issuedAt) &&
    Number.isSafeInteger(payload.expiresAt) &&
    payload.expiresAt > payload.issuedAt &&
    typeof payload.issuerUid === "string" &&
    payload.issuerUid.length > 0
  );
}

function isValidSignedVoucher(signedVoucher) {
  return (
    signedVoucher &&
    typeof signedVoucher === "object" &&
    !Array.isArray(signedVoucher) &&
    isValidPayload(signedVoucher.payload) &&
    signedVoucher.algorithm === ALGORITHM &&
    signedVoucher.keyId === KEY_ID &&
    typeof signedVoucher.signature === "string" &&
    /^[A-Za-z0-9_-]+$/.test(signedVoucher.signature)
  );
}

function verifySignature(signedVoucher) {
  try {
    if (!isValidSignedVoucher(signedVoucher)) {
      return false;
    }

    return crypto.verify(
      "sha256",
      Buffer.from(
        JSON.stringify(signedVoucher.payload),
        "utf8"
      ),
      publicKey,
      Buffer.from(
        signedVoucher.signature,
        "base64url"
      )
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

async function requireRole(role) {
  // Middleware factory
  return role;
}

function authorizeRole(requiredRole) {
  return async (req, res, next) => {
    try {
      const authorization =
        req.headers.authorization || "";

      if (!authorization.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          code: "UNAUTHENTICATED",
          message: "Authentication token is missing.",
        });
      }

      const token = authorization.substring(7);

      const decoded = await firebaseAuth.verifyIdToken(
        token,
        true
      );

      const userDoc = await db
        .collection("users")
        .doc(decoded.uid)
        .get();

      if (!userDoc.exists) {
        return res.status(403).json({
          success: false,
          code: "USER_NOT_FOUND",
          message: "User profile not found.",
        });
      }

      const userData = userDoc.data();

      if (
        userData.active !== true ||
        userData.role !== requiredRole
      ) {
        return res.status(403).json({
          success: false,
          code: "ACCESS_DENIED",
          message: `${requiredRole} access required.`,
        });
      }

      req.user = {
        uid: decoded.uid,
        role: userData.role,
        restaurantId: userData.restaurantId || null,
      };

      next();
    } catch (error) {
      console.error("Authorization error:", error);

      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid or expired authentication token.",
      });
    }
  };
}

const requireAdmin = authorizeRole("CHARITY_ADMIN");
const requireStaff = authorizeRole("RESTAURANT_STAFF");

function sendError(res, status, code, message) {
  return res.status(status).json({
    success: false,
    code,
    message,
  });
}

function extractSignedVoucher(body) {
  let value = body?.signedVoucher ?? body?.voucher ?? body;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (
    value &&
    typeof value === "object" &&
    value.signedVoucher
  ) {
    value = value.signedVoucher;
  }

  return value;
}

// HEALTH CHECK
app.get("/health", async (req, res) => {
  try {
    await db.collection("users").limit(1).get();

    return res.json({
      success: true,
      message: "MealSeal backend is running.",
    });
  } catch (error) {
    console.error("Health check error:", error);

    return sendError(
      res,
      500,
      "HEALTH_CHECK_FAILED",
      "Backend health check failed."
    );
  }
});

// PUBLIC VERIFICATION KEY
app.get("/public-key", (req, res) => {
  return res.json({
    algorithm: ALGORITHM,
    keyId: KEY_ID,
    publicKey,
  });
});

// CREATE VOUCHER
app.post(
  "/vouchers/create",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        recipientRef,
        restaurantId,
        mealType,
        quantity,
        expiryDate,
      } = req.body || {};

      if (
        typeof recipientRef !== "string" ||
        !recipientRef.trim() ||
        typeof restaurantId !== "string" ||
        !restaurantId.trim()
      ) {
        return sendError(
          res,
          400,
          "INVALID_INPUT",
          "Recipient and restaurant are required."
        );
      }

      if (
        !["Breakfast", "Lunch", "Dinner"].includes(
          mealType
        )
      ) {
        return sendError(
          res,
          400,
          "INVALID_MEAL",
          "Invalid meal type."
        );
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 20
      ) {
        return sendError(
          res,
          400,
          "INVALID_QUANTITY",
          "Quantity must be between 1 and 20."
        );
      }

      if (
        typeof expiryDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)
      ) {
        return sendError(
          res,
          400,
          "INVALID_DATE",
          "Expiry date must use YYYY-MM-DD."
        );
      }

      const [year, month, day] = expiryDate
        .split("-")
        .map(Number);

      const dateCheck = new Date(
        Date.UTC(year, month - 1, day)
      );

      if (
        dateCheck.getUTCFullYear() !== year ||
        dateCheck.getUTCMonth() !== month - 1 ||
        dateCheck.getUTCDate() !== day
      ) {
        return sendError(
          res,
          400,
          "INVALID_DATE",
          "Invalid expiry date."
        );
      }

      const issuedAt = Date.now();

      const expiresAt = Date.UTC(
        year,
        month - 1,
        day + 1
      );

      if (expiresAt <= issuedAt) {
        return sendError(
          res,
          400,
          "EXPIRED_DATE",
          "Expiry date must be in the future."
        );
      }

      const voucherId = crypto.randomUUID();

      const payload = {
        version: 1,
        voucherId,
        recipientRef: recipientRef.trim(),
        restaurantId: restaurantId.trim(),
        mealType,
        quantity,
        issuedAt,
        expiresAt,
        issuerUid: req.user.uid,
      };

      const signature = crypto
        .sign(
          "sha256",
          Buffer.from(
            JSON.stringify(payload),
            "utf8"
          ),
          privateKey
        )
        .toString("base64url");

      const signedVoucher = {
        payload,
        signature,
        algorithm: ALGORITHM,
        keyId: KEY_ID,
      };

      if (!verifySignature(signedVoucher)) {
        throw new Error(
          "Generated signature verification failed."
        );
      }

      await db
        .collection("vouchers")
        .doc(voucherId)
        .set({
          ...payload,
          signature,
          algorithm: ALGORITHM,
          keyId: KEY_ID,
          status: "ACTIVE",
          createdAt: FieldValue.serverTimestamp(),
          redeemedAt: null,
          redeemedBy: null,
        });

      return res.status(201).json({
        success: true,
        message: "Voucher digitally signed and created.",
        voucherId,
        signedVoucher,
      });
    } catch (error) {
      console.error("Create voucher error:", error);

      return sendError(
        res,
        500,
        "CREATE_FAILED",
        "Unable to create voucher."
      );
    }
  }
);

// ADMIN DASHBOARD
app.get(
  "/vouchers",
  requireAdmin,
  async (req, res) => {
    try {
      const snapshot = await db
        .collection("vouchers")
        .orderBy("issuedAt", "desc")
        .get();

      const summary = {
        total: 0,
        active: 0,
        redeemed: 0,
        expired: 0,
      };

      const vouchers = snapshot.docs.map((document) => {
        const data = document.data();

        let status = data.status;

        if (
          status === "ACTIVE" &&
          data.expiresAt <= Date.now()
        ) {
          status = "EXPIRED";
        }

        summary.total++;

        if (status === "ACTIVE") summary.active++;
        if (status === "REDEEMED") summary.redeemed++;
        if (status === "EXPIRED") summary.expired++;

        return {
          voucherId: document.id,
          recipientRef: data.recipientRef,
          restaurantId: data.restaurantId,
          mealType: data.mealType,
          quantity: data.quantity,
          issuedAt: data.issuedAt,
          expiresAt: data.expiresAt,
          status,
          algorithm: data.algorithm,
          keyId: data.keyId,
        };
      });

      return res.json({
        success: true,
        summary,
        vouchers,
        recentVouchers: vouchers.slice(0, 5),
      });
    } catch (error) {
      console.error("List vouchers error:", error);

      return sendError(
        res,
        500,
        "LIST_FAILED",
        "Unable to retrieve vouchers."
      );
    }
  }
);

// GET SIGNED VOUCHER FOR QR SHARING
app.get(
  "/vouchers/:voucherId/signed",
  requireAdmin,
  async (req, res) => {
    try {
      const voucherId = req.params.voucherId;

      const voucherDoc = await db
        .collection("vouchers")
        .doc(voucherId)
        .get();

      if (!voucherDoc.exists) {
        return sendError(
          res,
          404,
          "NOT_FOUND",
          "Voucher not found."
        );
      }

      const data = voucherDoc.data();

      if (data.voucherId !== voucherId) {
        return sendError(
          res,
          400,
          "INVALID_VOUCHER",
          "Stored voucher ID is invalid."
        );
      }

      const signedVoucher = {
        payload: buildPayload(data),
        signature: data.signature,
        algorithm: data.algorithm,
        keyId: data.keyId,
      };

      if (!verifySignature(signedVoucher)) {
        return sendError(
          res,
          400,
          "INVALID_SIGNATURE",
          "Voucher signature verification failed."
        );
      }

      return res.json({
        success: true,
        voucherId,
        signedVoucher,
      });
    } catch (error) {
      console.error("Get signed voucher error:", error);

      return sendError(
        res,
        500,
        "LOAD_FAILED",
        "Unable to retrieve signed voucher."
      );
    }
  }
);

// VERIFY SIGNATURE AND CURRENT STATUS
// This endpoint does NOT redeem the voucher.
app.post(
  "/vouchers/verify",
  requireStaff,
  async (req, res) => {
    try {
      const signedVoucher = extractSignedVoucher(
        req.body
      );

      if (!isValidSignedVoucher(signedVoucher)) {
        return sendError(
          res,
          400,
          "INVALID_VOUCHER",
          "Invalid signed voucher QR data."
        );
      }

      if (!verifySignature(signedVoucher)) {
        return sendError(
          res,
          400,
          "INVALID_SIGNATURE",
          "Invalid digital signature. Voucher rejected."
        );
      }

      const payload = signedVoucher.payload;

      if (
        !req.user.restaurantId ||
        payload.restaurantId !== req.user.restaurantId
      ) {
        return sendError(
          res,
          403,
          "WRONG_RESTAURANT",
          "This voucher belongs to another restaurant."
        );
      }

      const voucherDoc = await db
        .collection("vouchers")
        .doc(payload.voucherId)
        .get();

      if (!voucherDoc.exists) {
        return sendError(
          res,
          404,
          "NOT_FOUND",
          "Voucher not found in Firebase."
        );
      }

      const stored = voucherDoc.data();

      const storedPayload = buildPayload(stored);

      if (
        JSON.stringify(storedPayload) !==
          JSON.stringify(payload) ||
        stored.signature !== signedVoucher.signature ||
        stored.algorithm !== signedVoucher.algorithm ||
        stored.keyId !== signedVoucher.keyId
      ) {
        return sendError(
          res,
          400,
          "DATA_MISMATCH",
          "QR data does not match the stored voucher."
        );
      }

      if (stored.status === "REDEEMED") {
        return sendError(
          res,
          409,
          "ALREADY_REDEEMED",
          "This voucher has already been redeemed."
        );
      }

      if (payload.expiresAt <= Date.now()) {
        return sendError(
          res,
          410,
          "EXPIRED",
          "This voucher has expired."
        );
      }

      if (stored.status !== "ACTIVE") {
        return sendError(
          res,
          409,
          "NOT_ACTIVE",
          "This voucher is not active."
        );
      }

      return res.json({
        success: true,
        valid: true,
        verified: true,
        status: "ACTIVE",
        message: "Voucher verified successfully.",
        voucherId: payload.voucherId,
        recipientRef: payload.recipientRef,
        restaurantId: payload.restaurantId,
        mealType: payload.mealType,
        quantity: payload.quantity,
        expiresAt: payload.expiresAt,
        algorithm: ALGORITHM,
      });
    } catch (error) {
      console.error("Verify voucher error:", error);

      return sendError(
        res,
        500,
        "VERIFY_FAILED",
        "Unable to verify voucher."
      );
    }
  }
);

// REDEEM VOUCHER
// Firestore transaction prevents double redemption.
app.post(
  "/vouchers/redeem",
  requireStaff,
  async (req, res) => {
    try {
      const signedVoucher = extractSignedVoucher(
        req.body
      );

      if (!isValidSignedVoucher(signedVoucher)) {
        return sendError(
          res,
          400,
          "INVALID_VOUCHER",
          "Invalid signed voucher QR data."
        );
      }

      if (!verifySignature(signedVoucher)) {
        return sendError(
          res,
          400,
          "INVALID_SIGNATURE",
          "Invalid digital signature. Voucher rejected."
        );
      }

      const payload = signedVoucher.payload;

      if (
        !req.user.restaurantId ||
        payload.restaurantId !== req.user.restaurantId
      ) {
        return sendError(
          res,
          403,
          "WRONG_RESTAURANT",
          "This voucher belongs to another restaurant."
        );
      }

      const voucherRef = db
        .collection("vouchers")
        .doc(payload.voucherId);

      const result = await db.runTransaction(
        async (transaction) => {
          const voucherDoc = await transaction.get(
            voucherRef
          );

          if (!voucherDoc.exists) {
            return {
              success: false,
              statusCode: 404,
              code: "NOT_FOUND",
              message: "Voucher not found in Firebase.",
            };
          }

          const stored = voucherDoc.data();

          const storedPayload = buildPayload(stored);

          if (
            JSON.stringify(storedPayload) !==
              JSON.stringify(payload) ||
            stored.signature !==
              signedVoucher.signature ||
            stored.algorithm !==
              signedVoucher.algorithm ||
            stored.keyId !== signedVoucher.keyId
          ) {
            return {
              success: false,
              statusCode: 400,
              code: "DATA_MISMATCH",
              message:
                "QR data does not match the stored voucher.",
            };
          }

          if (stored.status === "REDEEMED") {
            return {
              success: false,
              statusCode: 409,
              code: "ALREADY_REDEEMED",
              message:
                "This voucher has already been redeemed.",
            };
          }

          if (payload.expiresAt <= Date.now()) {
            return {
              success: false,
              statusCode: 410,
              code: "EXPIRED",
              message: "This voucher has expired.",
            };
          }

          if (stored.status !== "ACTIVE") {
            return {
              success: false,
              statusCode: 409,
              code: "NOT_ACTIVE",
              message: "This voucher is not active.",
            };
          }

          transaction.update(voucherRef, {
            status: "REDEEMED",
            redeemedAt: FieldValue.serverTimestamp(),
            redeemedBy: req.user.uid,
          });

          return {
            success: true,
            statusCode: 200,
            code: "REDEEMED",
            message: "Voucher redeemed successfully.",
            voucherId: payload.voucherId,
            recipientRef: payload.recipientRef,
            restaurantId: payload.restaurantId,
            mealType: payload.mealType,
            quantity: payload.quantity,
            status: "REDEEMED",
          };
        }
      );

      const { statusCode, ...responseBody } = result;

      return res.status(statusCode).json(responseBody);
    } catch (error) {
      console.error("Redeem voucher error:", error);

      return sendError(
        res,
        500,
        "REDEEM_FAILED",
        "Unable to redeem voucher."
      );
    }
  }
);

// UNKNOWN ROUTES
app.use((req, res) => {
  return sendError(
    res,
    404,
    "ENDPOINT_NOT_FOUND",
    `Endpoint not found: ${req.method} ${req.path}`
  );
});

// GLOBAL ERROR HANDLER
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  return sendError(
    res,
    500,
    "SERVER_ERROR",
    "Internal server error."
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `MealSeal backend running on port ${PORT}`
  );
});
