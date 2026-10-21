import type { Handler } from '@netlify/functions';

/**
 * Netlify Function: 健康檢查
 * 端點: /.netlify/functions/health
 */
export const handler: Handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'ok',
      service: 'Stock Portfolio System API',
      timestamp: new Date().toISOString(),
    }),
  };
};
