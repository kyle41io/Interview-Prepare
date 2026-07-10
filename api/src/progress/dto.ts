import { IsBoolean, IsInt, IsOptional, IsNumber, IsString, Min, Max } from "class-validator";

export class TopicDto {
  @IsBoolean() learned!: boolean;
}

export class FlashcardDto {
  @IsOptional() @IsString() due_at?: string;
  @IsInt() interval!: number;
  @IsNumber() ease!: number;
  @IsInt() reps!: number;
}

export class QuizDto {
  @IsInt() @Min(0) @Max(100) pct!: number;
}

export class BookmarkDto {
  @IsBoolean() on!: boolean;
}

export class StreakDto {
  @IsInt() current!: number;
  @IsInt() longest!: number;
  @IsOptional() @IsString() last_day?: string;
}

export class SettingsDto {
  @IsOptional() @IsString() lang?: string;
  @IsOptional() @IsString() theme?: string;
  @IsOptional() @IsString() track_role?: string;
  @IsOptional() @IsString() track_level?: string;
}

// Accepts a Snapshot-shaped body for /sync; validated loosely (structure enforced by mergeSnapshot).
export class SyncDto {
  [k: string]: any;
}
