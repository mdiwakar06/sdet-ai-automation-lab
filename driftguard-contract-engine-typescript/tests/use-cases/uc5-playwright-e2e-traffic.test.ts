/**
 * Use Case 5: End-to-End Live Playwright Interception, Inference & HTML Report Generation
 */

import express from 'express';
import { Server } from 'http';
import { request as playwrightRequest } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { TrafficCollector } from '../../src/collector/TrafficCollector';
import { OpenApiBuilder } from '../../src/inferrer/OpenApiBuilder';
import { DiffEngine } from '../../src/diff/DiffEngine';
import { HtmlReporter } from '../../src/reporters/HtmlReporter';
import { OpenApiDocument } from '../../src/types/schema';
import { logger } from '../../src/utils/logger';

export async function runUseCase5(): Promise<{ name: string; passed: boolean; error?: string }> {
  const name = 'UC-5: Playwright E2E Interception & HTML Dashboard Generation';
  logger.section(`Running ${name}`);

  let server: Server | null = null;
  const PORT = 3888;
  const baseUrl = `http://127.0.0.1:${PORT}`;

  try {
    // 1. Setup Express Mock Microservice
    const app = express();
    app.use(express.json());

    // Route 1: Static Route /api/v1/users/me
    app.get('/api/v1/users/me', (req, res) => {
      res.json({
        id: 'usr_admin_001',
        name: 'Principal SDET',
        role: 'ADMIN',
        authenticated: true,
      });
    });

    // Route 2: Dynamic Route /api/v1/users/:userId
    app.get('/api/v1/users/:userId', (req, res) => {
      res.json({
        id: req.params.userId,
        name: 'Alice Smith',
        email: 'alice@example.com',
        tier: 'PREMIUM',
        createdAt: '2026-01-15T08:30:00Z',
      });
    });

    // Route 3: POST /api/v1/checkout/orders
    app.post('/api/v1/checkout/orders', (req, res) => {
      const { items, currency } = req.body;
      res.status(201).json({
        orderId: 'ord_987654321',
        totalAmount: 149.99,
        currency: currency || 'USD',
        status: 'CONFIRMED',
        itemCount: items ? items.length : 1,
      });
    });

    // Route 4: GET /api/v1/orders/:orderId
    app.get('/api/v1/orders/:orderId', (req, res) => {
      res.json({
        orderId: req.params.orderId,
        status: 'SHIPPED',
        trackingNumber: 'TRK-109283-US',
      });
    });

    // Start Express Server
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, '127.0.0.1', () => {
        logger.info(`Mock API Server listening at ${baseUrl}`);
        resolve();
      });
    });

    // 2. Playwright HTTP Client with Traffic Capture
    const collector = new TrafficCollector();
    const apiContext = await playwrightRequest.newContext({ baseURL: baseUrl });

    logger.info('Executing Playwright API interactions across microservice endpoints...');

    // Interaction 1: Call /api/v1/users/me
    const meRes = await apiContext.get('/api/v1/users/me');
    collector.capture({
      method: 'GET',
      url: `${baseUrl}/api/v1/users/me`,
      path: '/api/v1/users/me',
      requestHeaders: meRes.headers(),
      statusCode: meRes.status(),
      responseHeaders: meRes.headers(),
      responseBody: await meRes.json(),
      source: 'playwright',
    });

    // Interaction 2: Call /api/v1/users/550e8400-e29b-41d4-a716-446655440000 (UUID)
    const userRes = await apiContext.get('/api/v1/users/550e8400-e29b-41d4-a716-446655440000');
    collector.capture({
      method: 'GET',
      url: `${baseUrl}/api/v1/users/550e8400-e29b-41d4-a716-446655440000`,
      path: '/api/v1/users/550e8400-e29b-41d4-a716-446655440000',
      requestHeaders: userRes.headers(),
      statusCode: userRes.status(),
      responseHeaders: userRes.headers(),
      responseBody: await userRes.json(),
      source: 'playwright',
    });

    // Interaction 3: Post /api/v1/checkout/orders
    const orderPayload = {
      items: [{ sku: 'SKU-001', qty: 2, unitPrice: 49.99 }],
      currency: 'USD',
    };
    const orderRes = await apiContext.post('/api/v1/checkout/orders', {
      data: orderPayload,
    });
    collector.capture({
      method: 'POST',
      url: `${baseUrl}/api/v1/checkout/orders`,
      path: '/api/v1/checkout/orders',
      requestHeaders: { 'content-type': 'application/json' },
      requestBody: orderPayload,
      statusCode: orderRes.status(),
      responseHeaders: orderRes.headers(),
      responseBody: await orderRes.json(),
      source: 'playwright',
    });

    // Interaction 4: Call /api/v1/orders/ord_987654321
    const orderGetRes = await apiContext.get('/api/v1/orders/ord_987654321');
    collector.capture({
      method: 'GET',
      url: `${baseUrl}/api/v1/orders/ord_987654321`,
      path: '/api/v1/orders/ord_987654321',
      requestHeaders: orderGetRes.headers(),
      statusCode: orderGetRes.status(),
      responseHeaders: orderGetRes.headers(),
      responseBody: await orderGetRes.json(),
      source: 'playwright',
    });

    await apiContext.dispose();

    // 3. Autonomous Schema & OpenAPI 3.1 Inference
    logger.info(`Captured ${collector.getCount()} live transactions. Inferring OpenAPI 3.1 spec...`);
    const builder = new OpenApiBuilder({ title: 'Live Inferred Store API' });
    const observedSpec = builder.buildFromTraffic(collector.getRecords());

    // Verify Normalized Routes exist in observed spec
    const inferredPaths = Object.keys(observedSpec.paths);
    logger.info(`Inferred routes: ${inferredPaths.join(', ')}`);

    if (!inferredPaths.includes('/api/v1/users/me')) {
      throw new Error("Expected static route '/api/v1/users/me' in inferred spec.");
    }
    if (!inferredPaths.includes('/api/v1/users/{userId}')) {
      throw new Error("Expected parameterized route '/api/v1/users/{userId}' in inferred spec.");
    }
    if (!inferredPaths.includes('/api/v1/checkout/orders')) {
      throw new Error("Expected route '/api/v1/checkout/orders' in inferred spec.");
    }
    if (!inferredPaths.includes('/api/v1/orders/{orderId}')) {
      throw new Error("Expected parameterized route '/api/v1/orders/{orderId}' in inferred spec.");
    }

    // 4. Compare with Baseline Contract
    const baselineSpec: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'Baseline Store API', version: '1.0.0' },
      paths: {
        '/api/v1/users/me': {
          get: {
            summary: 'Get current user',
            responses: {
              '200': {
                description: 'User details',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['id', 'name', 'role'],
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        role: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/v1/users/{userId}': {
          get: {
            summary: 'Get user by id',
            responses: {
              '200': {
                description: 'User profile',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      // In baseline, 'phoneNumber' was required, but server didn't return it (simulating drift)
                      required: ['id', 'name', 'phoneNumber'],
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        phoneNumber: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const diffEngine = new DiffEngine();
    const report = diffEngine.compare(baselineSpec, observedSpec);

    // 5. Generate Standalone HTML Drift Dashboard
    const reportPath = path.resolve(__dirname, '../../reports/uc5-live-drift-report.html');
    HtmlReporter.generate(report, reportPath);
    logger.success(`Generated interactive HTML report at: ${reportPath}`);

    if (!fs.existsSync(reportPath)) {
      throw new Error(`HTML Report was not created at ${reportPath}`);
    }

    return { name, passed: true };
  } catch (err: any) {
    logger.error(`Use Case 5 failed: ${err.message}`);
    return { name, passed: false, error: err.message };
  } finally {
    if (server) {
      await new Promise<void>((resolve) => (server as Server).close(() => resolve()));
      logger.info('Mock API Server stopped.');
    }
  }
}
