import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportSectionDto {
  @ApiProperty({ description: '요약 문장' })
  summary!: string;

  @ApiProperty({ description: '섹션 점수', example: 82 })
  score!: number;
}

export class ReportChartDataDto {
  @ApiProperty({
    description: '차트 라벨 목록',
    example: ['공고문', 'IR Deck', '음성', 'Q&A'],
  })
  labels!: string[];

  @ApiProperty({ description: '차트 점수 목록', example: [82, 78, 75, 80] })
  scores!: number[];
}

export class AiReportBarChartItemDto {
  @ApiProperty({ example: 'AI 플랫폼' })
  label!: string;

  @ApiProperty({ example: 95 })
  score!: number;
}

export class AiReportBarChartDto {
  @ApiProperty({ type: [AiReportBarChartItemDto] })
  items!: AiReportBarChartItemDto[];
}

export class AiReportRadarChartDto {
  @ApiProperty({
    example: ['문제정의', '솔루션', '시장성', '전달력', 'Q&A대응력'],
  })
  labels!: string[];

  @ApiProperty({ example: [80, 75, 88, 85, 74] })
  scores!: number[];
}

export class AiReportDetailScoreDto {
  @ApiProperty({ example: '발표 완성도' })
  title!: string;

  @ApiProperty({ example: 81 })
  score!: number;

  @ApiProperty({ example: '발표자는 명확하게 전달 능력을 보여주며...' })
  description!: string;

  @ApiProperty({ example: ['명확한 문제 정의', '설득력 있는 스토리텔링'] })
  strengths!: string[];

  @ApiProperty({ example: ['불안정한 서술', '중요 내용 중심 발표 필요'] })
  improvements!: string[];
}

export class AiReportDto {
  @ApiProperty()
  pitch_id!: string;

  @ApiProperty({ example: 78 })
  final_score!: number;

  @ApiProperty({ type: AiReportRadarChartDto })
  radar_chart!: AiReportRadarChartDto;

  @ApiProperty({ type: AiReportBarChartDto })
  bar_chart!: AiReportBarChartDto;

  @ApiProperty({ type: [AiReportDetailScoreDto] })
  detail_scores!: AiReportDetailScoreDto[];

  @ApiProperty({
    example: ['핵심 키워드를 강조하세요', '재무 지표를 구체적으로 제시하세요'],
  })
  improvement_points!: string[];

  @ApiProperty()
  summary!: string;

  @ApiProperty({ example: '2026-06-03T00:00:00Z' })
  generated_at!: string;
}

export class GetReportResponseDto {
  @ApiProperty({ description: '리포트 ID' })
  report_id!: string;

  @ApiProperty({ description: 'Pitch ID' })
  pitch_id!: string;

  @ApiPropertyOptional({
    description: '공고 ID (notice 상세 조회용)',
    nullable: true,
  })
  notice_id!: string | null;

  @ApiPropertyOptional({
    description: 'IR 덱 ID (슬라이드 조회용: GET /api/ir-decks/{id}/slides)',
    nullable: true,
  })
  ir_deck_id!: string | null;

  @ApiPropertyOptional({
    description: '음성 분석 ID (슬라이드 조회용: GET /api/voice/{id}/slides)',
    nullable: true,
  })
  voice_analysis_id!: string | null;

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

  @ApiPropertyOptional({
    type: AiReportDto,
    description: 'AI가 생성한 상세 리포트 (없으면 null)',
    nullable: true,
  })
  ai_report!: AiReportDto | null;

  @ApiProperty({
    description: '최종 수정 시각',
    example: '2026-03-12T15:00:00Z',
  })
  updated_at!: string;
}
