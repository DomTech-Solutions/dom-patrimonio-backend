import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3020;

app.use(cors());
app.use(express.json());

// Register health routes
app.use(healthRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
