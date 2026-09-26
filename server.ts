import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 3001;

// Use environment variables or fallback to the provided keys
const supabaseUrl = process.env.SUPABASE_URL || 'https://lehiaorbhcxrriathvhf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_mnvgj1COfpXJqgqeBXdjvg_Hi59OT9l'; // Should use service_role in production

// Note: In this hackathon, we are mostly relying on Supabase direct connections from the frontend.
// The backend is set up here for any administrative or complex tasks that shouldn't be exposed.
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ParkSync API is running' });
});

// Example endpoint to check Supabase connection
app.get('/api/stats', async (req, res) => {
  try {
    const { count: lotsCount } = await supabase.from('lots').select('*', { count: 'exact', head: true });
    const { count: slotsCount } = await supabase.from('slots').select('*', { count: 'exact', head: true });
    
    res.json({ lots: lotsCount, slots: slotsCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
