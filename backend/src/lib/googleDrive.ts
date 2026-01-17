import { google, type drive_v3 } from 'googleapis';

/**
 * Google Drive client singleton configured via environment variables and OAuth2 refresh token.
 */
const requireEnv = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

let cachedConfig:
  | {
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      folderId: string;
    }
  | null = null;

const getDriveConfig = () => {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    clientId: requireEnv('DRIVE_CLIENT_ID'),
    clientSecret: requireEnv('DRIVE_CLIENT_SECRET'),
    refreshToken: requireEnv('DRIVE_REFRESH_TOKEN'),
    folderId: requireEnv('DRIVE_FOLDER_ID'),
  };

  return cachedConfig;
};

let driveClient: drive_v3.Drive | null = null;

const createDriveClient = (): drive_v3.Drive => {
  const { clientId, clientSecret, refreshToken } = getDriveConfig();
  const oauth2Client = new google.auth.OAuth2({
    clientId,
    clientSecret,
  });

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.drive({
    version: 'v3',
    auth: oauth2Client,
  });
};

export const getDrive = (): drive_v3.Drive => {
  if (driveClient) {
    return driveClient;
  }

  driveClient = createDriveClient();
  return driveClient;
};

export const getDriveRootFolderId = (): string => getDriveConfig().folderId;
