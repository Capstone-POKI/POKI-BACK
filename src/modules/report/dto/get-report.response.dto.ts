import { ApiProperty } from '@nestjs/swagger';

export class ReportSectionDto {
  @ApiProperty({ description: '요약 문장' })
  summary!: string;

  @ApiProperty({ description: '섹션 점수', example: 82 })
  score!: number;
}

export class ReportChartDataDto {
  @ApiProperty({ description: '차트 라벨 목록', example: ['공고문', 'IR Deck', '음성', 'Q&A'] })
  labels!: string[];

  @ApiProperty({ description: '차트 점수 목록', example: [82, 78, 75, 80] })
  scores!: number[];
}

export class GetReportResponseDto {
  @ApiProperty({ description: '리포트 ID' })
  report_id!: string;

  @ApiProperty({ type: ReportSectionDto })
  notice!: ReportSectionDto;

  @ApiProperty({ type: ReportSectionDto })
  ir_deck!: ReportSectionDto;

  @ApiProperty({ type: ReportSectionDto })
  speech!: ReportSectionDto;

  @ApiProperty({ type: ReportSectionDto })
  qa!: ReportSectionDto;

  @ApiProperty({ description: '최종 점수', example: 79 })
  final_score!: number;

  @ApiProperty({ type: ReportChartDataDto })
  chart_data!: ReportChartDataDto;

  @ApiProperty({ description: '최종 수정 시각', example: '2026-03-12T15:00:00Z' })
  updated_at!: string;
}