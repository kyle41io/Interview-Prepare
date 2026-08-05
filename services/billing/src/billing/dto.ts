import { IsIn, IsOptional, IsString } from "class-validator";
export class CreatePaymentDto { @IsOptional() @IsString() plan?: string; }
export class AdminDecideDto { @IsString() userId!: string; @IsString() code!: string; }
export const PAY_STATUSES = ["pending", "submitted", "approved", "rejected"] as const;
export class AdminListQueryDto { @IsIn(["pending", "submitted", "approved", "rejected"]) status!: string; }
