const dateStr = "06/02/2026"; // Feb 6th in DD/MM
const d = new Date(dateStr);
console.log('Original date string:', dateStr);
console.log('Parsed with new Date():', d.toString());
console.log('Month (0-indexed):', d.getMonth());

const parts = dateStr.split(/[\/-]/);
const day = parseInt(parts[0]);
const month = parseInt(parts[1]) - 1;
const year = parseInt(parts[2]);
const d2 = new Date(year, month, day);
console.log('Parsed with DD/MM logic:', d2.toString());
console.log('Month (0-indexed):', d2.getMonth());
