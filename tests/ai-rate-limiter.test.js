const express = require('express');
const request = require('supertest');

const authMiddleware = require('../src/middleware/authMiddleware');
const { aiLimiter } = require('../src/middleware/rateLimiters');

jest.mock('../src/middleware/authMiddleware', () => jest.fn((req, res, next) => next()));
jest.mock('../src/controllers/documentController', () => ({
  createDocument: jest.fn(),
  getProjectDocuments: jest.fn(),
  getDocument: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
}));

describe('shared authenticated-user AI limiting', () => {
  test('places authentication before the same AI limiter on document create and update', () => {
    const documentRoutes = require('../src/routes/documentRoutes');
    const createStack = documentRoutes.stack.find((layer) => layer.route?.path === '/').route.stack;
    const updateStack = documentRoutes.stack.find((layer) => (
      layer.route?.path === '/:id' && layer.route.methods.patch
    )).route.stack;

    expect(createStack[0].handle).toBe(authMiddleware);
    expect(createStack[1].handle).toBe(aiLimiter);
    expect(updateStack[0].handle).toBe(authMiddleware);
    expect(updateStack[1].handle.name).toBe('limitEmbeddingUpdate');

    const next = jest.fn();
    updateStack[1].handle({ body: {} }, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('shares one allowance across AI routes while isolating authenticated users', async () => {
    const app = express();
    app.use((req, res, next) => {
      req.user = { id: req.get('X-Test-User') };
      next();
    });
    app.post(['/ask', '/documents'], aiLimiter, (req, res) => res.sendStatus(204));

    for (let index = 0; index < 30; index += 1) {
      const path = index % 2 === 0 ? '/ask' : '/documents';
      await request(app).post(path).set('X-Test-User', 'user-a').expect(204);
    }
    await request(app).post('/ask').set('X-Test-User', 'user-a').expect(429, {
      message: 'Too many AI requests. Please try again later.',
    });
    await request(app).post('/documents').set('X-Test-User', 'user-b').expect(204);
  });
});
