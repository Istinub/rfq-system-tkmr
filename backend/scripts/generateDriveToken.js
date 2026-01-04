// Run with: node scripts/generateDriveToken.js
import fs from 'fs';
import http from 'http';
import { google } from 'googleapis';

const REDIRECT_URI = process.env.DRIVE_OAUTH_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const credentialsPath = new URL('./client_secret.json', import.meta.url);
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
const clientConfig = credentials.installed || credentials.web;

if (!clientConfig?.client_id || !clientConfig?.client_secret) {
  throw new Error('Invalid OAuth client JSON: missing client_id or client_secret.');
}

const oAuth2Client = new google.auth.OAuth2(clientConfig.client_id, clientConfig.client_secret, REDIRECT_URI);

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' || !req.url?.startsWith('/oauth2callback')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');

  if (!code) {
    console.error('No authorization code found in callback.');
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing code parameter');
    server.close(() => process.exit(1));
    return;
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    if (!tokens?.refresh_token) {
      console.error('No refresh_token received. Ensure you used access_type=offline and prompt=consent.');
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('Authorization succeeded but no refresh_token was returned. Check console.');
      server.close(() => process.exit(1));
      return;
    }

    console.log('\nAuthorization complete');
    console.log('REFRESH TOKEN (save in .env):', tokens.refresh_token);
    console.log('access_token:', tokens.access_token);
    console.log('expiry_date:', tokens.expiry_date);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('✅ Authorized. You can close this tab.');

    server.close(() => process.exit(0));
  } catch (err) {
    console.error('Token exchange failed:', err);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('Token exchange failed. Check console for details.');
    server.close(() => process.exit(1));
  }
});

server.listen(3000, async () => {
  console.log('Server listening on http://localhost:3000');

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    redirect_uri: REDIRECT_URI,
  });

  console.log('\n1) Open this URL in browser...');
  console.log(authUrl);
  console.log('2) Choose rfqtkmr@gmail.com');
  console.log('3) Approve');
  console.log('4) Copy refresh_token into .env\n');

  try {
    const mod = await import('open');
    const open = mod.default || mod;
    await open(authUrl);
  } catch (err) {
    console.log('Could not open browser automatically. Please open the URL above manually.');
  }
});
