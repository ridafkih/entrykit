import sodium from "sodium-native";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  const keyBuffer = Buffer.from(key, "base64");
  if (keyBuffer.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error(`ENCRYPTION_KEY must be ${sodium.crypto_secretbox_KEYBYTES} bytes`);
  }
  return keyBuffer;
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const message = Buffer.from(plaintext, "utf8");
  const nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES);
  sodium.randombytes_buf(nonce);

  const ciphertext = Buffer.alloc(message.length + sodium.crypto_secretbox_MACBYTES);
  sodium.crypto_secretbox_easy(ciphertext, message, nonce, key);

  return Buffer.concat([nonce, ciphertext]).toString("base64");
}

export function decrypt(encoded: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encoded, "base64");

  const nonce = data.subarray(0, sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = data.subarray(sodium.crypto_secretbox_NONCEBYTES);

  const message = Buffer.alloc(ciphertext.length - sodium.crypto_secretbox_MACBYTES);
  if (!sodium.crypto_secretbox_open_easy(message, ciphertext, nonce, key)) {
    throw new Error("Decryption failed");
  }

  return message.toString("utf8");
}
