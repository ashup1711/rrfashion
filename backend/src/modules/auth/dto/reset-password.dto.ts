/**
 * REQ-BE-012: Reset-password request DTO.
 *
 * The token is the single-use reset token issued by POST /auth/forgot-password
 * and stored in Redis with a 1-hour TTL. The new password is checked by the
 * IsStrongPassword decorator (REQ-BE-010) and additionally by the HIBP
 * service (REQ-BE-011) inside AuthService.
 */
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Single-use reset token issued by /auth/forgot-password' })
  @IsString()
  @Length(20, 256)
  token!: string;

  @ApiProperty({
    description: 'New password — min 10 chars, must include upper/lower/digit/symbol',
    example: 'NewStr0ng!Pass',
  })
  @IsStrongPassword()
  newPassword!: string;
}
