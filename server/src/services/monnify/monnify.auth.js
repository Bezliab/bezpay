import axios from 'axios';
import { env, MONNIFY_BASE_URL } from '../../config/env.js';
import { MonnifyError } from '../../utils/errors.js';

let cached = { token: null, expiresAt: 0 };
let inflight = null;

export async function getAccessToken(force = false) {
  if (!force && cached.token && Date.now() < cached.expiresAt) return cached.token;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const basic = Buffer.from(`${env.MONNIFY_API_KEY}:${env.MONNIFY_SECRET_KEY}`).toString('base64');
      const { data } = await axios.post(
        `${MONNIFY_BASE_URL}/api/v1/auth/login`,
        {},
        { headers: { Authorization: `Basic ${basic}` }, timeout: 15000 }
      );
      if (!data?.requestSuccessful) {
        throw new MonnifyError(data?.responseMessage || 'Monnify auth failed', { code: data?.responseCode });
      }
      const { accessToken, expiresIn } = data.responseBody;
      // refresh 60s early
      cached = { token: accessToken, expiresAt: Date.now() + Math.max(expiresIn - 60, 30) * 1000 };
      return accessToken;
    } catch (err) {
      if (err instanceof MonnifyError) throw err;
      throw new MonnifyError('Unable to authenticate with Monnify', {
        status: err.response?.status,
        cause: err,
      });
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
