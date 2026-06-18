import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ReportController } from '../src/modules/report/report.controller';
import { ReportService } from '../src/modules/report/report.service';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { FastApiClient } from '../src/infra/fastapi/fastapi.client';

describe('Report create (e2e)', () => {
  let app: INestApplication;

  const mockPrisma = {
    pitch: {
      findUnique: jest.fn(),
    },
    notice: {
      findFirst: jest.fn(),
    },
    iRDeck: {
      findFirst: jest.fn(),
    },
    rehearsal: {
      findFirst: jest.fn(),
    },
    qATraining: {
      findFirst: jest.fn(),
    },
    report: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  } as any as PrismaService;

  const mockFastApiClient = {
    generateAiReport: jest
      .fn()
      .mockRejectedValue(new Error('AI disabled in tests')),
  } as unknown as FastApiClient;

  const mockGuard = {
    canActivate: (context: any) => {
      const req = context.switchToHttp().getRequest();
      req.user = { id: 'user-1' };
      return true;
    },
  } as unknown as JwtAuthGuard;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FastApiClient, useValue: mockFastApiClient },
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 201 and persists the combined report', async () => {
    mockPrisma.pitch.findUnique.mockResolvedValue({
      id: 'pitch-1',
      userId: 'user-1',
      isDeleted: false,
    });
    mockPrisma.notice.findFirst.mockResolvedValue({
      id: 'notice-1',
      pitchId: 'pitch-1',
      noticeName: '스타트업 공고',
      hostOrganization: '중기부',
      recruitmentType: '창업지원',
      targetAudience: '예비창업자',
      applicationPeriod: '2026-03-01 ~ 2026-03-31',
      summary: '공고문 요약',
      coreRequirements: '핵심요건',
      additionalCriteria: '추가조건',
      irDeckGuide: 'IR Deck 가이드',
      evaluationCriteria: [
        {
          id: 'criteria-1',
          criteriaName: '문제정의',
          points: 20,
          pitchcoachInterpretation: '문제정의 해석',
          irGuide: '문제정의 가이드',
        },
        {
          id: 'criteria-2',
          criteriaName: '솔루션',
          points: 20,
          pitchcoachInterpretation: '솔루션 해석',
          irGuide: '솔루션 가이드',
        },
        {
          id: 'criteria-3',
          criteriaName: '시장성',
          points: 20,
          pitchcoachInterpretation: '시장성 해석',
          irGuide: '시장성 가이드',
        },
      ],
    });
    mockPrisma.iRDeck.findFirst.mockResolvedValue({
      id: 'deck-1',
      pitchId: 'pitch-1',
      totalScore: 78,
      presentationGuide: '발표 가이드',
      emphasizedSlides: '3, 4',
      improvedItems: '보완 항목',
      deckScore: {
        totalScore: 78,
        structureSummary: '구조 요약',
        strengths: '["강점1"]',
        improvements: '["개선1"]',
        criteriaScores: [{ score: 80 }, { score: 76 }],
      },
    });
    mockPrisma.rehearsal.findFirst.mockResolvedValue({
      id: 'voice-1',
      pitchId: 'pitch-1',
      totalScore: 75,
      structureSummary: '발표 구조 요약',
      overallStrengths: '["강점A"]',
      overallImprovements: '["개선A"]',
      improvedItems: '개선 포인트',
      detailScores: [{ score: 70 }, { score: 80 }],
    });
    mockPrisma.qATraining.findFirst.mockResolvedValue({
      id: 'qa-1',
      pitchId: 'pitch-1',
      mode: 'REALTIME',
      totalScore: 80,
      questions: [
        {
          id: 'q-1',
          category: 'NOTICE',
          displayOrder: 1,
          answer: {
            id: 'a-1',
            briefnessScore: 80,
            evidenceScore: 78,
            structureScore: 82,
            strengths: '강점1',
            weaknesses: '약점1',
          },
        },
      ],
    });
    mockPrisma.report.upsert.mockResolvedValue({
      id: 'report-1',
      pitchId: 'pitch-1',
      noticeId: 'notice-1',
      irDeckId: 'deck-1',
      rehearsalId: 'voice-1',
      generatedAt: new Date('2026-03-12T15:00:00Z'),
      updatedAt: new Date('2026-03-12T15:00:00Z'),
    });

    const res = await request(app.getHttpServer())
      .post('/api/pitches/pitch-1/report')
      .set('Authorization', 'Bearer FAKE');

    expect(res.status).toBe(201);
    expect(res.body.report_id).toBe('report-1');
    expect(res.body.pitch_id).toBe('pitch-1');
    expect(res.body.notice_score).toBeGreaterThan(0);
    expect(res.body.final_score).toBeGreaterThan(0);
    expect(mockPrisma.report.upsert).toHaveBeenCalledTimes(1);
  });

  it('returns 201 when QA questions exist but are not answered yet', async () => {
    mockPrisma.pitch.findUnique.mockResolvedValue({
      id: 'pitch-1',
      userId: 'user-1',
      isDeleted: false,
    });
    mockPrisma.notice.findFirst.mockResolvedValue({
      id: 'notice-1',
      pitchId: 'pitch-1',
      noticeName: '스타트업 공고',
      hostOrganization: '중기부',
      recruitmentType: '창업지원',
      targetAudience: '예비창업자',
      applicationPeriod: '2026-03-01 ~ 2026-03-31',
      summary: '공고문 요약',
      coreRequirements: '핵심요건',
      additionalCriteria: '추가조건',
      irDeckGuide: 'IR Deck 가이드',
      evaluationCriteria: [
        {
          id: 'criteria-1',
          criteriaName: '문제정의',
          points: 20,
          pitchcoachInterpretation: '문제정의 해석',
          irGuide: '문제정의 가이드',
        },
        {
          id: 'criteria-2',
          criteriaName: '솔루션',
          points: 20,
          pitchcoachInterpretation: '솔루션 해석',
          irGuide: '솔루션 가이드',
        },
        {
          id: 'criteria-3',
          criteriaName: '시장성',
          points: 20,
          pitchcoachInterpretation: '시장성 해석',
          irGuide: '시장성 가이드',
        },
      ],
    });
    mockPrisma.iRDeck.findFirst.mockResolvedValue({
      id: 'deck-1',
      pitchId: 'pitch-1',
      totalScore: 78,
      presentationGuide: '발표 가이드',
      emphasizedSlides: '3, 4',
      improvedItems: '보완 항목',
      deckScore: null,
    });
    mockPrisma.rehearsal.findFirst.mockResolvedValue({
      id: 'voice-1',
      pitchId: 'pitch-1',
      totalScore: 75,
      structureSummary: '발표 구조 요약',
      overallStrengths: '["강점A"]',
      overallImprovements: '["개선A"]',
      improvedItems: '개선 포인트',
      detailScores: [],
    });
    mockPrisma.qATraining.findFirst.mockResolvedValue({
      id: 'qa-1',
      pitchId: 'pitch-1',
      mode: 'REALTIME',
      totalScore: null,
      questions: [
        {
          id: 'q-1',
          category: 'NOTICE',
          displayOrder: 1,
          answer: null,
        },
        {
          id: 'q-2',
          category: 'BUSINESS',
          displayOrder: 2,
          answer: null,
        },
      ],
    });
    mockPrisma.report.upsert.mockResolvedValue({
      id: 'report-1',
      pitchId: 'pitch-1',
      noticeId: 'notice-1',
      irDeckId: 'deck-1',
      rehearsalId: 'voice-1',
      generatedAt: new Date('2026-03-12T15:00:00Z'),
      updatedAt: new Date('2026-03-12T15:00:00Z'),
    });

    const res = await request(app.getHttpServer())
      .post('/api/pitches/pitch-1/report')
      .set('Authorization', 'Bearer FAKE');

    expect(res.status).toBe(201);
    expect(res.body.qa_training_id).toBe('qa-1');
    expect(res.body.qa_score).toBe(0);
    expect(res.body.final_score).toBeGreaterThan(0);
    expect(mockPrisma.report.upsert).toHaveBeenCalledTimes(1);
  });

  it('returns 409 when required analysis data is missing', async () => {
    mockPrisma.pitch.findUnique.mockResolvedValue({
      id: 'pitch-1',
      userId: 'user-1',
      isDeleted: false,
    });
    mockPrisma.notice.findFirst.mockResolvedValue(null);
    mockPrisma.iRDeck.findFirst.mockResolvedValue(null);
    mockPrisma.rehearsal.findFirst.mockResolvedValue(null);
    mockPrisma.qATraining.findFirst.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/api/pitches/pitch-1/report')
      .set('Authorization', 'Bearer FAKE');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INSUFFICIENT_ANALYSIS_DATA');
  });

  it('returns 200 with the integrated report detail', async () => {
    mockPrisma.report.findUnique.mockResolvedValue({
      id: 'report-1',
      pitchId: 'pitch-1',
      noticeSummary:
        '본 공고는 예비창업자를 대상으로 하며 시장성, 문제정의, 실행가능성 중심의 평가를 요구합니다.',
      noticeScore: 82,
      irDeckSummary:
        '문제 정의와 시장 파트는 강점이 있으나, 수익모델과 재무 계획의 설득력은 추가 보완이 필요합니다.',
      irDeckScore: 78,
      voiceSummary:
        '전반적으로 전달력은 안정적이지만, 말속도 편차와 강조 부족으로 인해 핵심 포인트가 약하게 들릴 수 있습니다.',
      voiceScore: 75,
      qaSummary:
        '질문 의도 파악은 우수했으나, 답변 근거 제시와 구조적 마무리에서 일부 보완이 필요합니다.',
      qaScore: 80,
      finalScore: 79,
      chartData: JSON.stringify({
        labels: ['공고문', 'IR Deck', '음성', 'Q&A'],
        scores: [82, 78, 75, 80],
      }),
      updatedAt: new Date('2026-03-12T15:00:00Z'),
      pitch: {
        id: 'pitch-1',
        userId: 'user-1',
        isDeleted: false,
      },
    });

    const res = await request(app.getHttpServer())
      .get('/api/reports/report-1')
      .set('Authorization', 'Bearer FAKE');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      report_id: 'report-1',
      pitch_id: 'pitch-1',
      notice_id: null,
      ir_deck_id: null,
      voice_analysis_id: null,
      notice: {
        summary:
          '본 공고는 예비창업자를 대상으로 하며 시장성, 문제정의, 실행가능성 중심의 평가를 요구합니다.',
        score: 82,
      },
      ir_deck: {
        summary:
          '문제 정의와 시장 파트는 강점이 있으나, 수익모델과 재무 계획의 설득력은 추가 보완이 필요합니다.',
        score: 78,
      },
      speech: {
        summary:
          '전반적으로 전달력은 안정적이지만, 말속도 편차와 강조 부족으로 인해 핵심 포인트가 약하게 들릴 수 있습니다.',
        score: 75,
      },
      qa: {
        summary:
          '질문 의도 파악은 우수했으나, 답변 근거 제시와 구조적 마무리에서 일부 보완이 필요합니다.',
        score: 80,
      },
      final_score: 79,
      chart_data: {
        labels: ['공고문', 'IR Deck', '음성', 'Q&A'],
        scores: [82, 78, 75, 80],
      },
      ai_report: null,
      updated_at: '2026-03-12T15:00:00.000Z',
    });
  });

  it('returns 404 when the report is missing', async () => {
    mockPrisma.report.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/api/reports/report-missing')
      .set('Authorization', 'Bearer FAKE');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('REPORT_NOT_FOUND');
  });
});
