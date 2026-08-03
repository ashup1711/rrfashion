/**
 * REQ-BE-012: Forgot-password request DTO.
 *
 * Public endpoint — never reveals whether the email exists (always returns
 * the same response). The reset link is dispatched (or, in this codebase,
 * the OTP-equivalent token is stored) only when the user actually exists.
 */
import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Account email', example: 'user@example.com' })
  @IsEmail()
  email!: string;
}
