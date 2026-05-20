import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { FastApiClient } from '../../infra/fastapi/fastapi.client';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fastApiClient: FastApiClient,
  ) {}

  async generateReport(userId: string, pitchId: string, force = false) {
    const pitch = await this.prisma.pitch.findUnique({ where: { id: pitchId } });
    if (!pitch || pitch.isDeleted) throw new NotFoundException({ error: 'PITCH_NOT_FOUND' });
    if (pitch.userId !== userId) throw new ForbiddenException({ error: 'FORBIDDEN' });

    // Trigger AI report generation via FastApi
    try {
      const res = await this.fastApiClient.generateReport(pitchId, { force });

      // Persist minimal report record if returned
      if (res && res.report_id) {
        const now = new Date(res.generated_at ?? Date.now());
        await this.prisma.report.upsert({
          where: { pitchId },
          update: {
            noticeSummary: res.notice_summary ?? undefined,
            noticeScore: res.notice_score ?? undefined,
            irDeckSummary: res.ir_deck_summary ?? undefined,
            irDeckScore: res.ir_deck_score ?? undefined,
            voiceSummary: res.voice_summary ?? undefined,
            voiceScore: res.voice_score ?? undefined,
            qaSummary: res.qa_summary ?? undefined,
            qaScore: res.qa_score ?? undefined,
            finalScore: res.final_score ?? 0,
            chartData: res.chart_data ?? undefined,
            generatedAt: now,
          },
          create: {
            id: res.report_id,
            pitchId,
            noticeId: res.notice_id ?? null,
            irDeckId: res.ir_deck_id ?? null,
            rehearsalId: res.rehearsal_id ?? null,
            noticeSummary: res.notice_summary ?? null,
            noticeScore: res.notice_score ?? null,
            irDeckSummary: res.ir_deck_summary ?? null,
            irDeckScore: res.ir_deck_score ?? null,
            voiceSummary: res.voice_summary ?? null,
            voiceScore: res.voice_score ?? null,
            qaSummary: res.qa_summary ?? null,
            qaScore: res.qa_score ?? null,
            finalScore: res.final_score ?? 0,
            chartData: res.chart_data ?? null,
            generatedAt: now,
          },
        });
      }

      return res;
    } catch (err) {
      this.logger.error('Failed to generate report', err as any);
      throw err;
    }
  }

  async getReportById(userId: string, reportId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException({ error: 'REPORT_NOT_FOUND' });
    const pitch = await this.prisma.pitch.findUnique({ where: { id: report.pitchId } });
    if (!pitch || pitch.userId !== userId) throw new ForbiddenException({ error: 'FORBIDDEN' });

    return report;
  }

  async getReportByPitch(userId: string, pitchId: string) {
    const report = await this.prisma.report.findUnique({ where: { pitchId } });
    if (!report) throw new NotFoundException({ error: 'REPORT_NOT_FOUND' });
    const pitch = await this.prisma.pitch.findUnique({ where: { id: pitchId } });
    if (!pitch || pitch.userId !== userId) throw new ForbiddenException({ error: 'FORBIDDEN' });
    return report;
  }
}
