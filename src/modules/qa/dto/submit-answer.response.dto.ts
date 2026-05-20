import { ApiProperty } from '@nestjs/swagger';

export class QAAnswerResponseDto {
  @ApiProperty({ description: '답변 ID' })
  answer_id!: string;

  @ApiProperty({ description: '음성 파일 URL', nullable: true })
  audio_file_url!: string | null;

  @ApiProperty({ description: 'STT 전사 텍스트', nullable: true })
  transcription!: string | null;

  @ApiProperty({ description: '간결성 점수', nullable: true })
  briefness_score!: number | null;

  @ApiProperty({ description: '근거 점수', nullable: true })
  evidence_score!: number | null;

  @ApiProperty({ description: '구조 점수', nullable: true })
  structure_score!: number | null;

  @ApiProperty({ description: '강점 피드백', nullable: true })
  strengths!: string | null;

  @ApiProperty({ description: '약점 피드백', nullable: true })
  weaknesses!: string | null;

  @ApiProperty({ description: '답변 제출 시각', nullable: true })
  answered_at!: string | null;

  @ApiProperty({ description: '생성 시각' })
  created_at!: string;

  @ApiProperty({ description: '수정 시각' })
  updated_at!: string;
}

export class SubmitAnswerResponseDto {
  @ApiProperty({ description: '질문 ID' })
  question_id!: string;

  @ApiProperty({ type: () => QAAnswerResponseDto })
  answer!: QAAnswerResponseDto;
}