const API_URL = 'http://localhost:3000/api';

async function verify() {
    try {
        console.log('--- Verifying API Endpoints ---');

        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: 'HikeVP',
                password: 'Hike@Akash'
            })
        });

        if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`);
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✔ Login successful. Token obtained.');

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Fetch Admissions Data
        console.log('\nFetching Admissions Data...');
        const admissionsRes = await fetch(`${API_URL}/admissions`, { headers });
        const admissionsData = await admissionsRes.json();
        console.log(`✔ Found ${admissionsData.length} total admissions records.`);

        // 3. Fetch BDE Stats
        console.log('\nFetching BDE Stats...');
        const bdeStatsRes = await fetch(`${API_URL}/admissions/stats/bde`, { headers });
        const bdeStatsData = await bdeStatsRes.json();
        console.log(`✔ Found stats for ${bdeStatsData.length} BDEs.`);

        // 4. Fetch University Stats
        console.log('\nFetching University Stats...');
        const uniStatsRes = await fetch(`${API_URL}/admissions/stats/university`, { headers });
        const uniStatsData = await uniStatsRes.json();
        console.log(`✔ Found stats for ${uniStatsData.length} Universities.`);

        console.log('\n--- Verification Complete ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    }
}

verify();
