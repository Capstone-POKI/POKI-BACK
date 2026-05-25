import { DeckService } from './deck.service';

describe('DeckService notice criteria mapping', () => {
  const prisma = {
    notice: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    noticeEvaluationCriteria: {
      findMany: jest.fn(),
    },
  };

  const service = new DeckService(prisma as any, {} as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('IR strategy preserves original notice evaluation criteria names', async () => {
    prisma.notice.findUnique.mockResolvedValue({
      coreRequirements: '공고문 핵심 요구사항',
      recruitmentType: '공모전',
    });
    prisma.noticeEvaluationCriteria.findMany.mockResolvedValue([
      {
        criteriaName: '혁신성',
        points: 25,
        pitchcoachInterpretation: '혁신성 해석',
        irGuide: '혁신성 가이드',
      },
      {
        criteriaName: '시장성',
        points: 25,
        pitchcoachInterpretation: '시장성 해석',
        irGuide: '시장성 가이드',
      },
      {
        criteriaName: '성장성',
        points: 25,
        pitchcoachInterpretation: '성장성 해석',
        irGuide: '성장성 가이드',
      },
      {
        criteriaName: '창업가(팀) 역량',
        points: 25,
        pitchcoachInterpretation: '팀 역량 해석',
        irGuide: '팀 역량 가이드',
      },
    ]);

    const strategy = await (service as any).buildIrStrategy(
      'pitch-1',
      'COMPETITION',
      5,
      'notice-1',
    );

    expect(strategy.evaluation_criteria.map((row: any) => row.criteria_name)).toEqual([
      '혁신성',
      '시장성',
      '성장성',
      '창업가(팀) 역량',
    ]);
  });

  it('criteria weights are based on original notice criteria', async () => {
    prisma.noticeEvaluationCriteria.findMany.mockResolvedValue([
      { criteriaName: '혁신성', points: 25 },
      { criteriaName: '시장성', points: 25 },
      { criteriaName: '성장성', points: 25 },
      { criteriaName: '창업가(팀) 역량', points: 25 },
    ]);

    const weights = await (service as any).buildCriteriaWeights('notice-1');

    expect(weights).toEqual({
      혁신성: 0.25,
      시장성: 0.25,
      성장성: 0.25,
      '창업가(팀) 역량': 0.25,
    });
  });
});
