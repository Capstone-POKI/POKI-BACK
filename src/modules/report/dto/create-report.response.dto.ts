import { ApiProperty } from '@nestjs/swagger';

export class CreateReportResponseDto {
  @ApiProperty({ example: 'uuid-report-1' })
  report_id!: string;

  @ApiProperty({ example: 'uuid-pitch-1' })
  pitch_id!: string;

  @ApiProperty({ example: 'uuid-notice-1', nullable: true })
  notice_id!: string | null;

  @ApiProperty({ example: 'uuid-deck-1', nullable: true })
  ir_deck_id!: string | null;

  @ApiProperty({ example: 'uuid-voice-1', nullable: true })
  voice_analysis_id!: string | null;

  @ApiProperty({ example: 'uuid-qa-1', nullable: true })
  qa_training_id!: string | null;

  @ApiProperty({ example: 82 })
  notice_score!: number;

  @ApiProperty({ example: 78 })
  ir_deck_score!: number;

  @ApiProperty({ example: 75 })
  voice_score!: number;

  @ApiProperty({ example: 80 })
  qa_score!: number;

  @ApiProperty({ example: 79 })
  final_score!: number;

  @ApiProperty({ example: '2026-03-12T15:00:00Z' })
  generated_at!: string;

  @ApiProperty({ example: '2026-03-12T15:00:00Z' })
  updated_at!: string;
}