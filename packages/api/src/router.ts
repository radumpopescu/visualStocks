import { Router } from 'express';

import { actions } from './actions/index';
import { ACTIONS_HTTP_METHODS } from './types';
import requestIP from 'request-ip';

const router = Router();

actions.forEach((action) => {
  const { path, httpMethod, f } = action;
  if (httpMethod === undefined) {
    return;
  }
  if (httpMethod === ACTIONS_HTTP_METHODS.POST) {
    router.post(`/${path}`, async (req, res) => {
      const ipAddress = requestIP.getClientIp(req);
      const params = { ...req.body, ip: ipAddress };

      try {
        const result = await f({ params });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error });
      }
    });
  } else if (httpMethod === ACTIONS_HTTP_METHODS.GET) {
    router.get(`/${path}`, async (req, res) => {
      const ipAddress = requestIP.getClientIp(req);
      const params = { ...req.query, ip: ipAddress };
      try {
        const result = await f({ params });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error });
      }
    });
  }
});

export default router;
