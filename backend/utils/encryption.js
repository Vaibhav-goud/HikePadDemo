const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const key = Buffer.from(process.env.ENCRYPTION_KEY || 'hike_padv2_secret_key_32_chars_long_').slice(0, 32);
const ivLength = 16;

function encrypt(text) {
    if (!text) return null;
    try {
        const iv = crypto.randomBytes(ivLength);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        // Format: iv:encryptedData (encoded in hex)
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
}

function decrypt(text) {
    if (!text) return null;
    // Check if it's actually encrypted (contains color)
    if (!text.includes(':')) return text;

    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        // If decryption fails, it might be a hashed password or plain text
        console.warn('Decryption failed, might be hashed or legacy format');
        return null;
    }
}

module.exports = { encrypt, decrypt };
