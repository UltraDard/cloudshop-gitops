const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Metrics
const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

app.use(cors());
app.use(express.json());

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/products', (req, res) => {
    res.json({ message: 'Products endpoint' });
});

app.get('/api/orders', (req, res) => {
    res.json({ message: 'Orders endpoint' });
});

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
