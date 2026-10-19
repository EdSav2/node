const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json({ strict: false, limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Входящий запрос: ${req.method} ${req.url}`);
    next();
});

app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    const authHeader = req.headers['authorization'];
    const expectedToken = `Bearer ${process.env.AUTH_TOKEN}`;
    if (process.env.AUTH_TOKEN && authHeader !== expectedToken) {
        return res.status(401).json({ error: 'Unauthorized: Invalid AUTH_TOKEN' });
    }
    next();
});

app.post('/v1/chat/completions', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Отправка запроса на Moonshot (Kimi) API...`);
    
    const requestBody = req.body && Object.keys(req.body).length > 0 ? req.body : {
        model: "kimi-k3",
        messages: [{ role: "user", content: "ping" }]
    };

    try {
        const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`,
                // Маскируемся под стандартный браузер, чтобы обойти Cloudflare
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(requestBody)
        });

        console.log(`[${new Date().toISOString()}] Статус ответа от Kimi API: ${response.status}`);
        
        const responseText = await response.text(); // Читаем как обычный текст, чтобы избежать краша JSON

        // Проверяем, вернул ли сервер JSON или HTML страницу
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.log(`[${new Date().toISOString()}] Критическая ошибка: Kimi API вернул HTML вместо JSON! Текст ответа:`, responseText.substring(0, 500));
            return res.status(response.status).json({ 
                error: "Moonshot API HTML Error", 
                message: `Сервер Kimi вернул код ${response.status} и HTML-страницу. Проверьте баланс аккаунта Moonshot.`
            });
        }

        if (!response.ok) {
            console.log(`[${new Date().toISOString()}] Детали ошибки от Kimi API:`, JSON.stringify(data));
        }

        res.status(response.status).json(data);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Системная ошибка прокси при отправке в Kimi:`, error.message);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Proxy is live and running!');
});

app.listen(PORT, () => {
    console.log(`Proxy running on port ${PORT}`);
});
