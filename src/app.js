import 'dotenv/config';

import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import redis from 'redis';
import RateLimit from 'express-rate-limit';
import RateLimitRedis from 'rate-limit-redis';
import Youch from 'youch';
import * as Sentry from '@sentry/node';

import 'express-async-errors';

import routes from './routes';
import sentryConfig from './config/sentry';

import './database';

class App {
  constructor() {
    this.server = express();

    Sentry.init(sentryConfig);

    this.middleware();
    this.routes();
    this.exceptionHandler();
  }

  corsOptionsDelegate = function(req, callback) {
    let corsOptions;
    const whitelist = ['http://localhost:3000'];

    console.log('ORIGIN: ', req.header('Origin'));

    if (whitelist.indexOf(req.header('Origin')) !== -1) {
      callback(null, { origin: true });
    } else {
      callback({ message: 'Not allowed by CORS' }, { origin: false });
    }
  };

  middleware() {
    this.server.use(Sentry.Handlers.requestHandler());
    this.server.use(helmet());
    this.server.use(cors(this.corsOptionsDelegate));
    this.server.use(express.json());
    this.server.use(
      '/files',
      express.static(path.resolve(__dirname, '..', 'temp', 'upload'))
    );

    if (process.env.NODE_ENV !== 'development') {
      this.server.use(
        new RateLimit({
          store: new RateLimitRedis({
            client: redis.createClient({
              host: process.env.REDIS_HOST,
              port: process.env.REDIS_PORT,
              prefix: 'request_limit:',
            }),
          }),
          windowMs: 1000 * 60 * 15, // 15 minutes
          max: 1000,
          message: {
            error:
              'Many simultaneous requests to the system from this IP were detected, for security reasons, access will be blocked for 15 minutes.',
          },
        })
      );
    }
  }

  routes() {
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }

  exceptionHandler() {
    this.server.use(async (err, req, res, next) => {
      if (process.env.NODE_ENV === 'development') {
        const errors = await new Youch(err, req).toJSON();
        return res.status(500).json(errors);
      }

      return res.status(500).json({ error: 'Internal Server Error' });
    });
  }
}

export default new App().server;
