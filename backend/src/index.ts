import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { routes } from './routes';
import { errorHandler } from './middleware/error';
import { initSocket } from './socket';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*', credentials: true }));
app.use(morgan('short'));
app.use(compression());
app.use(express.json());

app.use(routes);
app.use(errorHandler);

const server = createServer(app);
export const io = initSocket(server);

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});

export default app;
