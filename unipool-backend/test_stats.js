const { getDashboardStats } = require('./src/services/ride.service');

async function test() {
    try {
        const stats = await getDashboardStats('5466f2c3-a37b-4876-84bd-2d150d7fc09f');
        console.log("Stats:", JSON.stringify(stats, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}
test();
