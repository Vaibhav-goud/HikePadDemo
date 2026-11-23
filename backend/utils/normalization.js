/**
 * Reusable utility for name normalization to ensure consistency across collections.
 * 
 * Rules:
 * 1. Trim leading/trailing spaces
 * 2. Convert to lowercase
 * 3. Collapse multiple spaces into a single space
 * 4. Remove special characters (except alphanumeric and spaces)
 * 
 * Example: " Vaibhav  Goud! " -> "vaibhav goud"
 * 
 * @param {string} name - The name to normalize
 * @returns {string} - The normalized name
 */
const normalizeName = (name) => {
    if (!name || typeof name !== 'string') return '';

    const oldLogicResult = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')           // Collapse multiple spaces
        .replace(/[^a-z0-9\s]/g, '');   // Remove special characters

    const parts = oldLogicResult.split(' ');

    // Find the first part that is not an initial (length > 1) to use as the first name, avoiding single-letter initials like "A Leela" mapped to "a"
    const firstName = parts.find(p => p.length > 1) || parts[0] || '';

    // Exception list for first names that refer to multiple distinct people (e.g. Yash B, Yash S)
    const exceptions = ['yash', 'harsh', 'sakshi', 'mohit', 'shubham', 'aditya', 'shaik'];
    if (exceptions.includes(firstName)) {
        return oldLogicResult;
    }

    return firstName;
};

const normalizeSource = (source) => {
    if (!source || typeof source !== 'string') return '';
    return source.trim().toLowerCase().replace(/\s+/g, ' ');
};

module.exports = { normalizeName, normalizeSource };
