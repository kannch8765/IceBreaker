import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World! This is a Node.js + TypeScript web app.');
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
