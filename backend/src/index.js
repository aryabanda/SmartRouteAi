import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {routeRouter} from './routes/route.js';
import {deviationRouter} from './routes/deviation.js';
import {searchRouter} from './routes/search.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({status: 'ok'}));

app.use('/api/route', routeRouter);
app.use('/api/deviation', deviationRouter);
app.use('/api/search', searchRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Smart Route AI backend listening on port ${PORT}`);
});
