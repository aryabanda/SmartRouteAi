import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {routeRouter} from './routes/route.js';
import {deviationRouter} from './routes/deviation.js';
import {searchRouter} from './routes/search.js';
import {authRouter} from './routes/auth.js';
import {contactsRouter} from './routes/contacts.js';
import {initDb} from './db/index.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({status: 'ok'}));

app.use('/api/route', routeRouter);
app.use('/api/deviation', deviationRouter);
app.use('/api/search', searchRouter);
app.use('/api/auth', authRouter);
app.use('/api/contacts', contactsRouter);

const PORT = process.env.PORT || 4000;

// DB must be initialized before the server starts accepting requests,
// since the very first register/login call reads from it immediately.
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Smart Route AI backend listening on port ${PORT}`);
  });
});
