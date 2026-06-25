import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3020;

app.use(cors({
  origin: 'http://localhost:5500'
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
