const fs = require('fs');
const https = require('https');

// 1. Read .env.local to find GEMINI_API_KEY
try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=(.+)/);

    if (!match) {
        console.error("❌ Could not find GEMINI_API_KEY in .env.local");
        process.exit(1);
    }

    const apiKey = match[1].trim();
    console.log(`✅ Found API Key: ${apiKey.substring(0, 5)}...`);

    // 2. Fetch Models
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.error) {
                    console.error("❌ API Error:", json.error.message);
                } else if (json.models) {
                    console.log("\n📋 Available Models:");
                    json.models.forEach(m => {
                        if (m.supportedGenerationMethods.includes('generateContent')) {
                            console.log(`- ${m.name.replace('models/', '')} (${m.version})`);
                        }
                    });
                } else {
                    console.log("Response:", json);
                }
            } catch (e) {
                console.error("Parse Error:", e.message);
                console.log("Raw Data:", data);
            }
        });
    }).on('error', (e) => {
        console.error("Request Error:", e.message);
    });

} catch (e) {
    console.error("Error reading .env.local:", e.message);
}
