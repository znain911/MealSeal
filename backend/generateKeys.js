
const {
  generateKeyPairSync,
} = require("node:crypto");

const fs = require("node:fs");
const path = require("node:path");

const keysDirectory = path.join(__dirname, "keys");

if (!fs.existsSync(keysDirectory)) {
  fs.mkdirSync(keysDirectory, { recursive: true });
}

const privateKeyPath = path.join(
  keysDirectory,
  "private.pem"
);

const publicKeyPath = path.join(
  keysDirectory,
  "public.pem"
);

// Prevent accidental replacement of existing keys.
if (
  fs.existsSync(privateKeyPath) ||
  fs.existsSync(publicKeyPath)
) {
  console.error(
    "Keys already exist. Existing keys were not overwritten."
  );
  process.exit(1);
}

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",

  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },

  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

fs.writeFileSync(privateKeyPath, privateKey, {
  encoding: "utf8",
  flag: "wx",
  mode: 0o600,
});

fs.writeFileSync(publicKeyPath, publicKey, {
  encoding: "utf8",
  flag: "wx",
});

console.log("ECDSA P-256 key pair generated successfully.");
console.log("Private key: keys/private.pem");
console.log("Public key: keys/public.pem");
