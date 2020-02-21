import { Router } from 'express';
import Brute from 'express-brute';
import BruteRedis from 'express-brute-redis';
import moment from 'moment';
import multer from 'multer';

import multerConfig from './config/mutter';

import AppointmentController from './app/controllers/AppointmentController';
import AvailableController from './app/controllers/AvailableController';
import FileController from './app/controllers/FileController';
import ProviderController from './app/controllers/ProviderController';
import NotificationController from './app/controllers/NotificationController';
import ScheduleController from './app/controllers/ScheduleController';
import SessionController from './app/controllers/SessionController';
import UserController from './app/controllers/UserController';

import authMiddleware from './app/middlewares/auth';

const routes = new Router();
const upload = multer(multerConfig);

const failCallback = (req, res, next, nextValidRequestDate) => {
  res.status(401).json({
    error: `You've made too many failed attempts in a short period of time, please try again ${moment(
      nextValidRequestDate
    ).fromNow()}`,
  });
  // res.redirect('/login');
};

const handleStoreError = error => {
  console.error(error);

  throw {
    message: error.message,
    parent: error.parent,
  };
};

const bruteStore = new BruteRedis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  prefix: 'login_attempts:',
});

const bruteForce = new Brute(bruteStore, {
  freeRetries: 5,
  minWait: 1000 * 60 * 1, // 1 minutes
  maxWait: 1000 * 60 * 5, // 5 minutes,
  lifetime: 1000 * 60 * 20, // 20 minutes,
  failCallback,
  handleStoreError,
});

routes.get('/', (req, res) => {
  res.json({ message: 'funcionando...' });
});
routes.post('/sessions', bruteForce.prevent, SessionController.store);

routes.post('/users', UserController.store);

routes.use(authMiddleware);

routes.put('/users', UserController.update);

routes.get('/providers', ProviderController.index);
routes.get('/providers/:providerId/available', AvailableController.index);

routes.get('/appointments', AppointmentController.index);
routes.post('/appointments', AppointmentController.store);
routes.delete('/appointments/:id', AppointmentController.delete);

routes.get('/schedule', ScheduleController.index);

routes.get('/notifications', NotificationController.index);
routes.put('/notifications/:id', NotificationController.update);

routes.post('/files', upload.single('file'), FileController.store);

export default routes;
