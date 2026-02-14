import crypto from "crypto";

const algorithm = "aes-256-cbc";
const ENCRYPTION_KEY = Buffer.from('abdf7015aed05ae04c9b08c3e33709176bbe0ab8b040aa0a418cf7087d38c711', 'hex');
const IV_LENGTH = 16;

export const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};


export const decrypt = (data) => {
  const [ivHex, encrypted] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
