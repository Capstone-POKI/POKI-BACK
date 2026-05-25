import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReportResponseDto } from './dto/create-report.response.dto';
import { GetReportResponseDto } from './dto/get-report.response.dto';
import { ReportService } from './report.service';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('pitches/:pitchId/reports')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '전체 분석 통합 리포트 생성' })
  @ApiParam({ name: 'pitchId', description: 'Pitch ID' })
  @ApiResponse({ status: 201, type: CreateReportResponseDto })
  @ApiResponse({
    status: 401,
    schema: { example: { error: 'UNAUTHORIZED' } },
  })
  @ApiResponse({
    status: 404,
    schema: { example: { error: 'PITCH_NOT_FOUND' } },
  })
  @ApiResponse({
    status: 409,
    schema: {
      example: {
        error: 'INSUFFICIENT_ANALYSIS_DATA',
        message: '리포트 생성을 위한 분석 데이터가 충분하지 않습니다.',
      },
    },
  })
  create(
    @Param('pitchId') pitchId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CreateReportResponseDto> {
    return this.reportService.create(req.user.id, pitchId);
  }

  @Get('reports/:reportId')
  @ApiOperation({ summary: '리포트 상세 조회' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiResponse({ status: 200, type: GetReportResponseDto })
  @ApiResponse({
    status: 401,
    schema: { example: { error: 'UNAUTHORIZED' } },
  })
  @ApiResponse({
    status: 404,
    schema: { example: { error: 'REPORT_NOT_FOUND' } },
  })
  getOne(
    @Param('reportId') reportId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<GetReportResponseDto> {
    return this.reportService.getOne(req.user.id, reportId);
  }
}
