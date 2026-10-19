const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// УВЕЛИЧИВАЕМ ЛИМИТ ПРИЕМА ДАННЫХ ДО 50 МЕГАБАЙТ
app.use(express.json({ strict: false, limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Настройка CORS для Janitor AI
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

// Логгер входящих запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Входящий запрос: ${req.method} ${req.url}`);
    next();
});

// Проверка вашего пароля (AUTH_TOKEN)
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    
    const authHeader = req.headers['authorization'];
    const expectedToken = `Bearer ${process.env.AUTH_TOKEN}`;
    
    if (process.env.AUTH_TOKEN && authHeader !== expectedToken) {
        console.log(`[${new Date().toISOString()}] Ошибка: Неверный токен авторизации от Janitor AI`);
        return res.status(401).json({ error: 'Unauthorized: Invalid AUTH_TOKEN' });
    }
    next();
});

// Главный обработчик чата
app.post('/v1/chat/completions', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Отправка запроса на Moonshot (Kimi) API...`);
    
    const requestBody = req.body && Object.keys(req.body).length > 0 
        ? req.body 
        : {
            model: "kimi-k3",
            messages: [{ role: "user", content: "ping" }]
          };

    try {
        const response = await fetch('https://moonshot.ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log(`[${new Date().toISOString()}] Статус ответа от Kimi API: ${response.status}`);
        
        const data = await response.json();
        
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
