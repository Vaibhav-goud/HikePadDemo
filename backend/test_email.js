require('dotenv').config();
const { sendPasswordSetupEmail } = require('./utils/gmail');

async function test() {
    console.log('Testing email sending...');
    console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'Set' : 'MISSING');
    console.log('GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? 'Set' : 'MISSING');

    try {
        await sendPasswordSetupEmail('test@example.com', 'Test User', 'Admin', 'http://localhost:8080/reset');
        console.log('Test email sent successfully!');
    } catch (error) {
        console.error('Test email failed:', error.message);
    }
}

test();
