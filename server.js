const express = require('express');
const cors = require('cors'); // Подключаем CORS
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8080;

// РАЗРЕШАЕМ ЗАПРОСЫ С JANITOR AI
app.use(cors({
    origin: '*', // Позволяет Janitor AI достучаться до сервера
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Логгер
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Запрос: ${req.method} ${req.url}`);
    next();
});

// Проверка токена
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return next(); // Пропускаем предварительные запросы браузера
    const authHeader = req.headers['authorization'];
    const expectedToken = `Bearer ${process.env.AUTH_TOKEN}`;
    if (process.env.AUTH_TOKEN && authHeader !== expectedToken) {
        return res.status(401).json({ error: 'Invalid AUTH_TOKEN' });
    }
    next();
});

// Прокси на Moonshot
app.use('/', createProxyMiddleware({
    target: 'https://moonshot.ai',
    changeOrigin: true,
    onProxyReq: (proxyReq) => {
        proxyReq.setHeader('Authorization', `Bearer ${process.env.MOONSHOT_API_KEY}`);
    }
}));

app.listen(PORT, () => {
    console.log(`Proxy running on port ${PORT}`);
});
