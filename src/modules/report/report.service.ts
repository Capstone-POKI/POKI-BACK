import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { GetReportResponseDto } from './dto/get-report.response.dto';
import { CreateReportResponseDto } from './dto/create-report.response.dto';

type NoticeRow = {
  id: string;
  pitchId: string;
  noticeName: string;
  hostOrganization: string | null;
  recruitmentType: string | null;
  targetAudience: string | null;
  applicationPeriod: string | null;
  summary: string | null;
  coreRequirements: string | null;
  additionalCriteria: string | null;
  irDeckGuide: string | null;
  evaluationCriteria: Array<{
    id: string;
    criteriaName: string;
    points: number | null;
    pitchcoachInterpretation: string | null;
    irGuide: string | null;
  }>;
};

type IrDeckRow = {
  id: string;
  pitchId: string;
  totalScore: number | null;
  presentationGuide: string | null;
  emphasizedSlides: string | null;
  improvedItems: string | null;
  deckScore: {
    totalScore: number;
    structureSummary: string | null;
    strengths: string | null;
    improvements: string | null;
    criteriaScores: Array<{
      score: number;
    }>;
  } | null;
};

type RehearsalRow = {
  id: string;
  pitchId: string;
  totalScore: number | null;
  structureSummary: string | null;
  overallStrengths: string | null;
  overallImprovements: string | null;
  improvedItems: string | null;
  detailScores: Array<{
    score: number;
  }>;
};

type QaTrainingRow = {
  id: string;
  pitchId: string;
  mode: string;
  totalScore: number | null;
  questions: Array<{
    id: string;
    category: string;
    displayOrder: number;
    answer: {
      id: string;
      briefnessScore: number | null;
      evidenceScore: number | null;
      structureScore: number | null;
      strengths: string | null;
      weaknesses: string | null;
    } | null;
  }>;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function compactText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => compactText(String(item))).filter(Boolean);
    }
  } catch {
    // fall through to comma-separated parsing
  }

  return compactText(value)
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((item) => compactText(item.replace(/^"|"$/g, '')))
    .filter(Boolean);
}

type ReportRow = {
  id: string;
  pitchId: string;
  noticeSummary: string | null;
  noticeScore: number | null;
  irDeckSummary: string | null;
  irDeckScore: number | null;
  voiceSummary: string | null;
  voiceScore: number | null;
  qaSummary: string | null;
  qaScore: number | null;
  finalScore: number;
  chartData: string | null;
  generatedAt: Date;
  updatedAt: Date;
  pitch: {
    id: string;
    userId: string;
    isDeleted: boolean;
  };
};

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getOne(userId: string, reportId: string): Promise<GetReportResponseDto> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        pitchId: true,
        noticeSummary: true,
        noticeScore: true,
        irDeckSummary: true,
        irDeckScore: true,
        voiceSummary: true,
        voiceScore: true,
        qaSummary: true,
        qaScore: true,
        finalScore: true,
        chartData: true,
        generatedAt: true,
        updatedAt: true,
        pitch: {
          select: {
            id: true,
            userId: true,
            isDeleted: true,
          },
        },
      },
    }) as ReportRow | null;

    if (!report || report.pitch.isDeleted) {
      throw new NotFoundException({
        error: 'REPORT_NOT_FOUND',
        message: '해당 report를 찾을 수 없습니다.',
      });
    }

    if (report.pitch.userId !== userId) {
      throw new ForbiddenException({
        error: 'UNAUTHORIZED',
        message: '해당 report에 접근할 권한이 없습니다.',
      });
    }

    return {
      report_id: report.id,
      notice: {
        summary: report.noticeSummary ?? '',
        score: report.noticeScore ?? 0,
      },
      ir_deck: {
        summary: report.irDeckSummary ?? '',
        score: report.irDeckScore ?? 0,
      },
      speech: {
        summary: report.voiceSummary ?? '',
        score: report.voiceScore ?? 0,
      },
      qa: {
        summary: report.qaSummary ?? '',
        score: report.qaScore ?? 0,
      },
      final_score: report.finalScore,
      chart_data: this.parseChartData(report.chartData, report),
      updated_at: report.updatedAt.toISOString(),
    };
  }

  async create(userId: string, pitchId: string): Promise<CreateReportResponseDto> {
    const pitch = await this.prisma.pitch.findUnique({
      where: { id: pitchId },
      select: { id: true, userId: true, isDeleted: true },
    });

    if (!pitch || pitch.isDeleted) {
      throw new NotFoundException({
        error: 'PITCH_NOT_FOUND',
        message: '존재하지 않는 피칭입니다',
      });
    }

    if (pitch.userId !== userId) {
      throw new ForbiddenException({
        error: 'UNAUTHORIZED',
        message: '해당 pitch에 접근할 권한이 없습니다.',
      });
    }

    const [notice, irDeck, rehearsal, qaTraining] = await Promise.all([
      this.findLatestCompletedNotice(pitchId),
      this.findLatestCompletedIrDeck(pitchId),
      this.findLatestCompletedRehearsal(pitchId),
      this.findLatestCompletedQaTraining(pitchId),
    ]);

    if (!notice || !irDeck || !rehearsal || !qaTraining) {
      throw new ConflictException({
        error: 'INSUFFICIENT_ANALYSIS_DATA',
        message: '리포트 생성을 위한 분석 데이터가 충분하지 않습니다.',
      });
    }

    const noticeScore = this.calculateNoticeScore(notice);
    const irDeckScore = this.calculateIrDeckScore(irDeck);
    const voiceScore = this.calculateVoiceScore(rehearsal);
    const qaScore = this.calculateQaScore(qaTraining);
    const finalScore = clampScore(average([noticeScore, irDeckScore, voiceScore, qaScore]));
    const generatedAt = new Date();

    const report = await this.prisma.report.upsert({
      where: { pitchId },
      create: {
        pitchId,
        noticeId: notice.id,
        irDeckId: irDeck.id,
        rehearsalId: rehearsal.id,
        noticeSummary: this.buildNoticeSummary(notice, noticeScore),
        noticeScore,
        irDeckSummary: this.buildIrDeckSummary(irDeck, irDeckScore),
        irDeckScore,
        voiceSummary: this.buildVoiceSummary(rehearsal, voiceScore),
        voiceScore,
        qaSummary: this.buildQaSummary(qaTraining, qaScore),
        qaScore,
        finalScore,
        chartData: JSON.stringify(
          this.buildChartData(noticeScore, irDeckScore, voiceScore, qaScore, finalScore),
        ),
        generatedAt,
      },
      update: {
        noticeId: notice.id,
        irDeckId: irDeck.id,
        rehearsalId: rehearsal.id,
        noticeSummary: this.buildNoticeSummary(notice, noticeScore),
        noticeScore,
        irDeckSummary: this.buildIrDeckSummary(irDeck, irDeckScore),
        irDeckScore,
        voiceSummary: this.buildVoiceSummary(rehearsal, voiceScore),
        voiceScore,
        qaSummary: this.buildQaSummary(qaTraining, qaScore),
        qaScore,
        finalScore,
        chartData: JSON.stringify(
          this.buildChartData(noticeScore, irDeckScore, voiceScore, qaScore, finalScore),
        ),
        generatedAt,
      },
    });

    return {
      report_id: report.id,
      pitch_id: report.pitchId,
      notice_id: report.noticeId,
      ir_deck_id: report.irDeckId,
      voice_analysis_id: report.rehearsalId,
      qa_training_id: qaTraining.id,
      notice_score: noticeScore,
      ir_deck_score: irDeckScore,
      voice_score: voiceScore,
      qa_score: qaScore,
      final_score: finalScore,
      generated_at: report.generatedAt.toISOString(),
      updated_at: report.updatedAt.toISOString(),
    };
  }

  private parseChartData(
    value: string | null,
    report: Pick<ReportRow, 'noticeScore' | 'irDeckScore' | 'voiceScore' | 'qaScore'>,
  ): { labels: string[]; scores: number[] } {
    if (value) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (
          parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as { labels?: unknown }).labels) &&
          Array.isArray((parsed as { scores?: unknown }).scores)
        ) {
          return {
            labels: (parsed as { labels: unknown[] }).labels.map((label) => String(label)),
            scores: (parsed as { scores: unknown[] }).scores.map((score) => Number(score)),
          };
        }
      } catch {
        // fall back to derived chart data below
      }
    }

    return {
      labels: ['공고문', 'IR Deck', '음성', 'Q&A'],
      scores: [
        report.noticeScore ?? 0,
        report.irDeckScore ?? 0,
        report.voiceScore ?? 0,
        report.qaScore ?? 0,
      ],
    };
  }

  private async findLatestCompletedNotice(pitchId: string): Promise<NoticeRow | null> {
    return this.prisma.notice.findFirst({
      where: { pitchId, isLatest: true, analysisStatus: 'COMPLETED' },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        pitchId: true,
        noticeName: true,
        hostOrganization: true,
        recruitmentType: true,
        targetAudience: true,
        applicationPeriod: true,
        summary: true,
        coreRequirements: true,
        additionalCriteria: true,
        irDeckGuide: true,
        evaluationCriteria: {
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            criteriaName: true,
            points: true,
            pitchcoachInterpretation: true,
            irGuide: true,
          },
        },
      },
    });
  }

  private async findLatestCompletedIrDeck(pitchId: string): Promise<IrDeckRow | null> {
    return this.prisma.iRDeck.findFirst({
      where: { pitchId, isLatest: true, analysisStatus: 'COMPLETED' },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        pitchId: true,
        totalScore: true,
        presentationGuide: true,
        emphasizedSlides: true,
        improvedItems: true,
        deckScore: {
          select: {
            totalScore: true,
            structureSummary: true,
            strengths: true,
            improvements: true,
            criteriaScores: {
              select: { score: true },
            },
          },
        },
      },
    });
  }

  private async findLatestCompletedRehearsal(pitchId: string): Promise<RehearsalRow | null> {
    return this.prisma.rehearsal.findFirst({
      where: { pitchId, isLatest: true, analysisStatus: 'COMPLETED' },
      orderBy: { rehearsalNumber: 'desc' },
      select: {
        id: true,
        pitchId: true,
        totalScore: true,
        structureSummary: true,
        overallStrengths: true,
        overallImprovements: true,
        improvedItems: true,
        detailScores: {
          select: { score: true },
        },
      },
    });
  }

  private async findLatestCompletedQaTraining(pitchId: string): Promise<QaTrainingRow | null> {
    return this.prisma.qATraining.findFirst({
      where: { pitchId, isLatest: true },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        pitchId: true,
        mode: true,
        totalScore: true,
        questions: {
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            category: true,
            displayOrder: true,
            answer: {
              select: {
                id: true,
                briefnessScore: true,
                evidenceScore: true,
                structureScore: true,
                strengths: true,
                weaknesses: true,
              },
            },
          },
        },
      },
    });
  }

  private calculateNoticeScore(notice: NoticeRow): number {
    let score = 100;
    if (!compactText(notice.noticeName)) score -= 5;
    if (!compactText(notice.hostOrganization)) score -= 5;
    if (!compactText(notice.recruitmentType)) score -= 5;
    if (!compactText(notice.targetAudience)) score -= 5;
    if (!compactText(notice.applicationPeriod)) score -= 5;
    if (!compactText(notice.summary)) score -= 12;
    if (!compactText(notice.coreRequirements)) score -= 15;
    if (!compactText(notice.additionalCriteria)) score -= 5;
    if (!compactText(notice.irDeckGuide)) score -= 8;

    const criteriaCount = notice.evaluationCriteria.length;
    if (criteriaCount < 3) score -= 10;
    else if (criteriaCount < 5) score -= 5;

    const missingGuidanceCount = notice.evaluationCriteria.filter(
      (criteria) =>
        !compactText(criteria.pitchcoachInterpretation) || !compactText(criteria.irGuide),
    ).length;
    score -= Math.min(8, missingGuidanceCount * 2);

    return clampScore(score);
  }

  private calculateIrDeckScore(irDeck: IrDeckRow): number {
    if (irDeck.totalScore != null) {
      return clampScore(irDeck.totalScore);
    }

    if (irDeck.deckScore?.totalScore != null) {
      return clampScore(irDeck.deckScore.totalScore);
    }

    const criteriaScores = irDeck.deckScore?.criteriaScores.map((item) => item.score) ?? [];
    if (criteriaScores.length > 0) {
      return clampScore(average(criteriaScores));
    }

    throw new ConflictException({
      error: 'INSUFFICIENT_ANALYSIS_DATA',
      message: '리포트 생성을 위한 분석 데이터가 충분하지 않습니다.',
    });
  }

  private calculateVoiceScore(rehearsal: RehearsalRow): number {
    if (rehearsal.totalScore != null) {
      return clampScore(rehearsal.totalScore);
    }

    const detailScores = rehearsal.detailScores.map((item) => item.score);
    if (detailScores.length > 0) {
      return clampScore(average(detailScores));
    }

    throw new ConflictException({
      error: 'INSUFFICIENT_ANALYSIS_DATA',
      message: '리포트 생성을 위한 분석 데이터가 충분하지 않습니다.',
    });
  }

  private calculateQaScore(training: QaTrainingRow): number {
    if (training.totalScore != null) {
      return clampScore(training.totalScore);
    }

    const answeredQuestions = training.questions.filter((question) => Boolean(question.answer));
    if (answeredQuestions.length !== training.questions.length || answeredQuestions.length === 0) {
      throw new ConflictException({
        error: 'INSUFFICIENT_ANALYSIS_DATA',
        message: '리포트 생성을 위한 분석 데이터가 충분하지 않습니다.',
      });
    }

    const answerScores = answeredQuestions.map((question) => {
      const scores = [
        question.answer?.briefnessScore,
        question.answer?.evidenceScore,
        question.answer?.structureScore,
      ].filter((score): score is number => score != null);

      if (scores.length === 0) {
        throw new ConflictException({
          error: 'INSUFFICIENT_ANALYSIS_DATA',
          message: '리포트 생성을 위한 분석 데이터가 충분하지 않습니다.',
        });
      }

      return average(scores);
    });

    return clampScore(average(answerScores));
  }

  private buildNoticeSummary(notice: NoticeRow, score: number): string {
    const sections = [
      notice.noticeName ? `공고명: ${notice.noticeName}` : null,
      notice.hostOrganization ? `주관기관: ${notice.hostOrganization}` : null,
      notice.applicationPeriod ? `신청기간: ${notice.applicationPeriod}` : null,
      notice.summary ? `요약: ${notice.summary}` : null,
      notice.coreRequirements ? `핵심요구사항: ${notice.coreRequirements}` : null,
      notice.additionalCriteria ? `추가조건: ${notice.additionalCriteria}` : null,
    ].filter((line): line is string => Boolean(line));

    return [`공고문 분석 점수 ${score}점`, ...sections].join(' | ');
  }

  private buildIrDeckSummary(irDeck: IrDeckRow, score: number): string {
    const strengths = irDeck.deckScore?.strengths ? parseStringArray(irDeck.deckScore.strengths) : [];
    const improvements = irDeck.deckScore?.improvements ? parseStringArray(irDeck.deckScore.improvements) : [];

    return [
      `IR Deck 분석 점수 ${score}점`,
      irDeck.deckScore?.structureSummary ? `구조 요약: ${irDeck.deckScore.structureSummary}` : null,
      irDeck.presentationGuide ? `발표 가이드: ${irDeck.presentationGuide}` : null,
      irDeck.emphasizedSlides ? `강조 슬라이드: ${irDeck.emphasizedSlides}` : null,
      irDeck.improvedItems ? `보완 항목: ${irDeck.improvedItems}` : null,
      strengths.length > 0 ? `강점: ${strengths.join(', ')}` : null,
      improvements.length > 0 ? `개선점: ${improvements.join(', ')}` : null,
    ]
      .filter((line): line is string => Boolean(line))
      .join(' | ');
  }

  private buildVoiceSummary(rehearsal: RehearsalRow, score: number): string {
    const strengths = parseStringArray(rehearsal.overallStrengths);
    const improvements = parseStringArray(rehearsal.overallImprovements);

    return [
      `음성 분석 점수 ${score}점`,
      rehearsal.structureSummary ? `구조 요약: ${rehearsal.structureSummary}` : null,
      rehearsal.improvedItems ? `개선 항목: ${rehearsal.improvedItems}` : null,
      strengths.length > 0 ? `강점: ${strengths.join(', ')}` : null,
      improvements.length > 0 ? `개선점: ${improvements.join(', ')}` : null,
    ]
      .filter((line): line is string => Boolean(line))
      .join(' | ');
  }

  private buildQaSummary(training: QaTrainingRow, score: number): string {
    const answeredQuestions = training.questions.filter((question) => Boolean(question.answer));
    const totalQuestions = training.questions.length;
    const strengths = answeredQuestions
      .map((question) => parseStringArray(question.answer?.strengths).slice(0, 1)[0])
      .filter((value): value is string => Boolean(value));
    const weaknesses = answeredQuestions
      .map((question) => parseStringArray(question.answer?.weaknesses).slice(0, 1)[0])
      .filter((value): value is string => Boolean(value));

    return [
      `Q&A 훈련 점수 ${score}점`,
      `모드: ${training.mode}`,
      `응답 완료: ${answeredQuestions.length}/${totalQuestions}`,
      strengths.length > 0 ? `강점: ${strengths.join(', ')}` : null,
      weaknesses.length > 0 ? `보완점: ${weaknesses.join(', ')}` : null,
    ]
      .filter((line): line is string => Boolean(line))
      .join(' | ');
  }

  private buildChartData(
    noticeScore: number,
    irDeckScore: number,
    voiceScore: number,
    qaScore: number,
    finalScore: number,
  ): Record<string, unknown> {
    return {
      labels: ['공고문', 'IR Deck', '음성', 'Q&A', '최종'],
      scores: [noticeScore, irDeckScore, voiceScore, qaScore, finalScore],
      datasets: [
        {
          label: '리포트 점수',
          data: [noticeScore, irDeckScore, voiceScore, qaScore, finalScore],
        },
      ],
    };
  }
}

