import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (_request, response) => {
  response.json({
    message: 'Auction Platform API is running',
    health: '/api/health',
  });
});

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'auction-platform-api',
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
