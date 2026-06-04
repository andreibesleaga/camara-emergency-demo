import app, { cfg } from './app';
import logger from './utils/logger';

const port = Number(process.env.PORT || 8080);
app.listen(port, () => logger.info(`Server running on :${port} (mock=${cfg.useMock})`));
