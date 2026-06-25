import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3020;

app.use(cors({
  origin: 'http://localhost:3030'
}));
app.use(express.json());

// Register health route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Dom Património Backend',
    timestamp: new Date()
  });
});

// Register favicon route
app.get('/favicon.ico', (req, res) => {
  res.set('Content-Type', 'image/svg+xml');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💰</text></svg>`);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
