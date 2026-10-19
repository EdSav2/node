const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Проверка токена авторизации (чтобы никто чужой не тратил ваши деньги)
app.use((req, res, next) => {
    const authHeader = req.headers['authorization'];
    const expectedToken = `Bearer ${process.env.AUTH_TOKEN}`;
    
    if (process.env.AUTH_TOKEN && authHeader !== expectedToken) {
        return res.status(401).json({ error: 'Unauthorized: Invalid AUTH_TOKEN' });
    }
    next();
});

// Перенаправление всех запросов на официальный API Moonshot (Kimi)
app.use('/', createProxyMiddleware({
    target: 'https://moonshot.ai',
    changeOrigin: true,
    pathRewrite: (path) => path, // сохраняет пути /v1/chat/completions
    onProxyReq: (proxyReq) => {
        // Подмена вашего оригинального API-ключа от Kimi
        proxyReq.setHeader('Authorization', `Bearer ${process.env.MOONSHOT_API_KEY}`);
    }
}));

app.listen(PORT, () => {
    console.log(`Proxy running on port ${PORT}`);
});
