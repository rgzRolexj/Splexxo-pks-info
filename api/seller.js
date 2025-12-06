// ==================== CONFIG =====================
const YOUR_API_KEYS = ["ROLEX"];
const TARGET_API = "https://pakistan-num-info.gauravcyber0.workers.dev/";
const CACHE_TIME = 3600 * 1000;
// =================================================

const cache = new Map();

function cleanOxmzoo(value) {
    if (typeof value == "string") {
        return value.replace(/@Gaurav_Cyber/gi, "").trim();
    }
    if (Array.isArray(value)) {
        return value.map(cleanOxmzoo);
    }
    if (value && typeof value === "object") {
        const cleaned = {};
        for (const key of Object.keys(value)) {
            if (key.toLowerCase().includes("oxmzoo")) continue;
            cleaned[key] = cleanOxmzoo(value[key]);
        }
        return cleaned;
    }
    return value;
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    // Sirf GET allow
    if (req.method !== "GET") {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(405).json({ error: "method not allowed" });
    }

    const { mobile: rawMobile, key: rawKey, pakistan: rawPakistan } = req.query || {};

    // Param check - mobile ya pakistan dono me se koi ek
    const phoneNumber = rawMobile || rawPakistan;
    
    if (!phoneNumber || !rawKey) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(400).json({ 
            error: "missing parameters", 
            details: "Use: ?mobile=Number&key=SPLEXXO OR ?pakistan=Number&key=SPLEXXO" 
        });
    }

    const number = String(phoneNumber).replace(/\D/g, "");
    const key = String(rawKey).trim();

    // API key check
    if (!YOUR_API_KEYS.includes(key)) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(403).json({ error: "invalid key" });
    }

    if (number.length < 10) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(400).json({ error: "invalid number" });
    }

    // Cache check
    const now = Date.now();
    const cached = cache.get(number);

    if (cached && now - cached.timestamp < CACHE_TIME) {
        res.setHeader("X-Proxy-Cache", "HIT");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(200).send(cached.response);
    }

    // Upstream URL build - PAKISTAN API FORMAT
    const url = `${TARGET_API}?pakistan=${encodeURIComponent(number)}`;

    try {
        const upstream = await fetch(url);
        const raw = await upstream.text();

        if (!upstream.ok || !raw) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            return res.status(502).json({
                error: "Pakistan number API failed",
                details: `HTTP ${upstream.status}`,
            });
        }

        let responseBody;

        try {
            // JSON try parse
            let data = JSON.parse(raw);

            // @Gaurav_Cyber clean
            data = cleanOxmzoo(data);

            // Apna clean branding
            data.developer = "splexxo";
            data.credit_by = "splexx";
            data.powered_by = "splexxo-info-api";

            responseBody = JSON.stringify(data);
        } catch (e) {
            // Agar JSON nahi hai, to raw text se @Gaurav_Cyber hata do
            const cleanedText = raw.replace(/@Gaurav_Cyber/gi, "").trim();
            responseBody = cleanedText;
        }

        // Cache save
        cache.set(number, {
            timestamp: Date.now(),
            response: responseBody,
        });

        res.setHeader("X-Proxy-Cache", "MISS");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(200).send(responseBody);
    } catch (err) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(502).json({
            error: "upstream request error",
            details: err.message || "unknown error",
        });
    }
}
