const express = require('express');

const app = express();
const PORT = process.env.PORT || 8081;

// Metrics
const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

app.use(express.json());

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/login', (req, res) => {
    res.json({ token: 'fake-token' });
});

app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});
