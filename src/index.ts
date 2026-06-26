import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabaseClient';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3020;

app.use(cors({
  origin: 'http://localhost:3030'
}));
app.use(express.json());

// Register health route with Supabase connectivity check
app.get('/health', async (req, res) => {
  let supabaseStatus = 'online';
  let supabaseError = null;

  try {
    // Tenta uma consulta dummy rápida no Supabase
    const { error } = await supabase.from('_connection_test').select('*').limit(0);
    
    if (error) {
      const isPostgrestError = error.code && (error.code.startsWith('PGRST') || error.code.startsWith('42') || error.code === '42000' || error.code === '42P01');
      
      if (!isPostgrestError) {
        supabaseStatus = 'offline';
        supabaseError = error.message;
      }
    }
  } catch (err: any) {
    supabaseStatus = 'offline';
    supabaseError = err.message || err;
  }

  const isDegraded = supabaseStatus === 'offline';

  res.status(200).json({
    status: isDegraded ? 'degraded' : 'ok',
    app: 'Dom Património Backend',
    timestamp: new Date(),
    services: {
      supabase: supabaseStatus,
      ...(isDegraded && { error: supabaseError })
    }
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
