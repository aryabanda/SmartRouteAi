import 'dotenv/config';

import express from 'express';
import cors from 'cors';

import {routeRouter} from './routes/route.js';
import {deviationRouter} from './routes/deviation.js';
import {searchRouter} from './routes/search.js';
import {authRouter} from './routes/auth.js';
import {contactsRouter} from './routes/contacts.js';
import {journeysRouter} from './routes/journeys.js';
import {trafficRouter} from './routes/traffic.js';

import {trackRouter} from './routes/track.js';
import {trackPageRouter} from './routes/trackPage.js';

import {initDb} from './db/index.js';


const app = express();


/*
 * Middleware
 */
app.use(cors());

app.use(express.json());


/*
 * Health check
 */
app.get(
  '/health',
  (req, res) => {
    res.json({
      status: 'ok',
    });
  },
);


/*
 * Existing API routes
 */
app.use(
  '/api/route',
  routeRouter,
);

app.use(
  '/api/deviation',
  deviationRouter,
);

app.use(
  '/api/search',
  searchRouter,
);

app.use(
  '/api/auth',
  authRouter,
);

app.use(
  '/api/contacts',
  contactsRouter,
);

app.use(
  '/api/journeys',
  journeysRouter,
);

app.use(
  '/api/traffic',
  trafficRouter,
);


/*
 * Public live tracking API.
 *
 * No login required because the emergency contact
 * accesses it using the secret share token.
 */
app.use(
  '/api/public/track',
  trackRouter,
);


/*
 * Public tracking webpage.
 *
 * Example:
 *
 * https://your-backend.onrender.com/track/abc123
 */
app.use(
  '/track',
  trackPageRouter,
);


const PORT =
  process.env.PORT || 4000;


/*
 * Initialize DB before accepting requests.
 */
initDb()
  .then(() => {

    app.listen(
      PORT,
      () => {

        console.log(
          `Smart Route AI backend listening on port ${PORT}`,
        );

      },
    );

  })
  .catch(err => {

    console.error(
      'Failed to initialize database:',
      err,
    );

    process.exit(1);

  });