import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { QaController } from '../src/modules/qa/qa.controller';
import { QaService } from '../src/modules/qa/qa.service';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { FastApiClient } from '../src/infra/fastapi/fastapi.client';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';

describe('QA Answer Feedback (e2e)', () => {
  let app: INestApplication;

  const mockPrisma = {
    qAAnswer: {
      findUnique: jest.fn(),
    },
  } as any as PrismaService;

  const mockFastApi = {} as FastApiClient;

  const mockGuard = {
    canActivate: (context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { id: 'user-1' };
      return true;
    },
  } as unknown as JwtAuthGuard;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [QaController],
      providers: [
        QaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FastApiClient, useValue: mockFastApi },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with answer feedback for owner', async () => {
    mockPrisma.qAAnswer.findUnique.mockResolvedValue({
      id: 'a-1',
      questionId: 'q-1',
      audioFileUrl: 'https://storage.pitchcoach.ai/qa/a-1.webm',
      transcription: '저희 솔루션은 기존 경쟁사 대비 도입 비용을 40% 절감하면서도...',
      briefnessScore: 24,
      evidenceScore: 21,
      structureScore: 26,
      strengths:
        '핵심 메시지를 초반에 제시했고, 경쟁사 대비 차별점을 비교적 명확하게 설명했습니다.',
      weaknesses:
        '구체적인 수치 근거와 고객 사례가 부족하며, 마무리 구조가 다소 길어졌습니다.',
      answeredAt: new Date('2026-03-12T14:15:00Z'),
      createdAt: new Date('2026-03-12T14:15:00Z'),
      updatedAt: new Date('2026-03-12T14:18:00Z'),
      question: {
        id: 'q-1',
        qaTraining: {
          id: 'qa-1',
          pitch: { id: 'pitch-1', userId: 'user-1', isDeleted: false },
        },
      },
    });

    const res = await request(app.getHttpServer())
      .get('/api/answers/a-1')
      .set('Authorization', 'Bearer FAKE');

    expect(res.status).toBe(200);
    expect(res.body.answer_id).toBe('a-1');
    expect(res.body.briefness_score).toBe(24);
    expect(res.body.updated_at).toBe('2026-03-12T14:18:00.000Z');
  });

  it('returns 404 when answer not found or not owner', async () => {
    mockPrisma.qAAnswer.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/api/answers/a-not-exist')
      .set('Authorization', 'Bearer FAKE');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
