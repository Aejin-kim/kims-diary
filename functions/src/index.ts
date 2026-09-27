import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express, { Request, Response } from 'express';
import cors from 'cors';

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Firebase Cloud Functions 기본 상태 확인 엔드포인트
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'kims-diary-functions',
    timestamp: new Date().toISOString(),
  });
});

export const api = functions.https.onRequest(app);
