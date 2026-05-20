export class ReportResponseDto {
  report_id: string;
  pitch_id: string;
  notice_id?: string | null;
  ir_deck_id?: string | null;
  rehearsal_id?: string | null;
  notice_summary?: string | null;
  notice_score?: number | null;
  ir_deck_summary?: string | null;
  ir_deck_score?: number | null;
  voice_summary?: string | null;
  voice_score?: number | null;
  qa_summary?: string | null;
  qa_score?: number | null;
  final_score: number;
  chart_data?: string | null;
  generated_at: string;
  updated_at: string;
}
