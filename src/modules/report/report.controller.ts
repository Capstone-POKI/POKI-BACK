import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportService } from './report.service';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('pitches/:pitchId/reports')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Generate final report for a pitch' })
  @ApiParam({ name: 'pitchId', description: 'Pitch ID' })
  async generate(@Param('pitchId') pitchId: string, @Req() req: AuthenticatedRequest, @Body() body: { force?: boolean }) {
    return this.reportService.generateReport(req.user.id, pitchId, Boolean(body?.force));
  }

  @Get('reports/:reportId')
  @ApiOperation({ summary: 'Get report detail by reportId' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  async getById(@Param('reportId') reportId: string, @Req() req: AuthenticatedRequest) {
    const r = await this.reportService.getReportById(req.user.id, reportId);
    return {
      report_id: r.id,
      pitch_id: r.pitchId,
      notice_id: r.noticeId,
      ir_deck_id: r.irDeckId,
      rehearsal_id: r.rehearsalId,
      notice_summary: r.noticeSummary,
      notice_score: r.noticeScore,
      ir_deck_summary: r.irDeckSummary,
      ir_deck_score: r.irDeckScore,
      voice_summary: r.voiceSummary,
      voice_score: r.voiceScore,
      qa_summary: r.qaSummary,
      qa_score: r.qaScore,
      final_score: r.finalScore,
      chart_data: r.chartData,
      generated_at: r.generatedAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    };
  }

  @Get('pitches/:pitchId/report')
  @ApiOperation({ summary: 'Get report for a given pitch (latest)' })
  @ApiParam({ name: 'pitchId', description: 'Pitch ID' })
  async getByPitch(@Param('pitchId') pitchId: string, @Req() req: AuthenticatedRequest) {
    const r = await this.reportService.getReportByPitch(req.user.id, pitchId);
    return {
      report_id: r.id,
      pitch_id: r.pitchId,
      notice_id: r.noticeId,
      ir_deck_id: r.irDeckId,
      rehearsal_id: r.rehearsalId,
      notice_summary: r.noticeSummary,
      notice_score: r.noticeScore,
      ir_deck_summary: r.irDeckSummary,
      ir_deck_score: r.irDeckScore,
      voice_summary: r.voiceSummary,
      voice_score: r.voiceScore,
      qa_summary: r.qaSummary,
      qa_score: r.qaScore,
      final_score: r.finalScore,
      chart_data: r.chartData,
      generated_at: r.generatedAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    };
  }
}
