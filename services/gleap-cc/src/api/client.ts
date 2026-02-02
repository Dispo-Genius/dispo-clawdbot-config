import axios, { AxiosInstance, AxiosError } from 'axios';

const API_KEY = process.env.GLEAP_API_KEY;
const PROJECT_ID = process.env.GLEAP_PROJECT_ID;

function checkCredentials(): boolean {
  if (!API_KEY || !PROJECT_ID) {
    console.log(JSON.stringify({
      success: false,
      error: 'GLEAP_API_KEY and GLEAP_PROJECT_ID environment variables required. Run: gateway-cc keys set GLEAP_API_KEY && gateway-cc keys set GLEAP_PROJECT_ID'
    }));
    return false;
  }
  return true;
}

export function createClient(): AxiosInstance | null {
  if (!checkCredentials()) {
    return null;
  }

  const client = axios.create({
    baseURL: 'https://api.gleap.io/v3',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Api-Token': PROJECT_ID!,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data as Record<string, unknown>;

        if (status === 429) {
          console.log(JSON.stringify({
            success: false,
            error: 'Rate limit exceeded (1000 req/60s). Wait and retry.',
          }));
        } else if (status === 401) {
          console.log(JSON.stringify({
            success: false,
            error: 'Invalid API key or project ID. Check credentials.',
          }));
        } else if (status === 404) {
          console.log(JSON.stringify({
            success: false,
            error: 'Resource not found.',
          }));
        } else {
          console.log(JSON.stringify({
            success: false,
            error: data.message || data.error || `API error: ${status}`,
          }));
        }
      } else if (error.request) {
        console.log(JSON.stringify({
          success: false,
          error: 'Network error. Check connection.',
        }));
      } else {
        console.log(JSON.stringify({
          success: false,
          error: error.message,
        }));
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const gleapClient = createClient();
