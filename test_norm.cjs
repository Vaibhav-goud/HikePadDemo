
const normalizeName = (name) => {
    if (!name || typeof name !== 'string') return '';

    const parts = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^a-z0-9\s]/g, '')
        .split(' ');

    // Find the first part that is not an initial (length > 1)
    const firstName = parts.find(p => p.length > 1) || parts[0] || '';
    return firstName;
};

const testNames = [
    "Pratik",
    "Pratik T",
    "T Pratik",
    "A Leela",
    "Leela",
    "Pratham",
    "Pratham Jain",
    "Yash B",
    "Yash S",
    "Vatsh",
    "Zohra Baig",
    "zohra",
    "A Soumya",
    "Soumya"
];

console.log('--- Testing New Normalization ---');
testNames.forEach(name => {
    console.log(`Original: "${name}" -> Result: "${normalizeName(name)}"`);
});
