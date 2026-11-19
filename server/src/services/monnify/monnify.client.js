// TODO: Implement this module.
import axios from "axios";
import { MONNIFY_BASE_URL } from "../../config/env.js";
import { getAccessToken } from "./monnify.auth.js";
import { MonnifyError } from "../../utils/errors.js";

const http = axios.create({ baseURL: MONNIFY_BASE_URL, timeout: 20000 });

export async function monnifyRequest({ method, url, params, data }) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getAccessToken(attempt > 0);
    try {
      const res = await http.request({
        method,
        url,
        params,
        data,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.data?.requestSuccessful) {
        throw new MonnifyError(
          res.data?.responseMessage || "Monnify request failed",
          {
            code: res.data?.responseCode,
            status: res.status,
          },
        );
      }
      return res.data.responseBody;
    } catch (err) {
      if (err instanceof MonnifyError) throw err;
      if (err.response?.status === 401 && attempt === 0) continue; // token revoked: re-login once
      const b = err.response?.data;
      throw new MonnifyError(b?.responseMessage || err.message, {
        code: b?.responseCode,
        status: err.response?.status,
        cause: err,
      });
    }
  }
}
