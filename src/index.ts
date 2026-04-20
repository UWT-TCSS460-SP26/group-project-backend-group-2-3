import 'dotenv/config';
import { app } from './app';
import { getPort } from './config/env';

const PORT = getPort();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`API docs at http://localhost:${PORT}/api-docs`);
});
