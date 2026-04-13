import 'dotenv/config';
import { app } from './app';
import collinsRouter from './routes/collins.routes';
const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API docs at http://localhost:${PORT}/api-docs`);
});
app.use('/', collinsRouter);
