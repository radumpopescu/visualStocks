import { Action, ACTIONS_HTTP_METHODS } from '../types';
import fs from 'fs';
import path from 'path';

const testAction: Action = {
  path: 'test',
  httpMethod: ACTIONS_HTTP_METHODS.GET,
  f: async () => {
    return new Date().toISOString();
  },
};

const timestampAction: Action = {
  path: 'timestamp',
  httpMethod: ACTIONS_HTTP_METHODS.GET,
  f: async () => {
    const timestamp = new Date().toISOString();
    const dataDir = path.join(__dirname, 'data');

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write timestamp to file
    const filePath = path.join(dataDir, 'ts.txt');
    fs.writeFileSync(filePath, timestamp);

    return { timestamp, filePath };
  },
};

export default [testAction, timestampAction];
