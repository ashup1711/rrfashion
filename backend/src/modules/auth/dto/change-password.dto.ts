/**
 * REQ-BE-012: Authenticated password change.
 *
 * Requires the user's current password for verification (prevents hijacked
 * sessions from silently changing the password) plus the new password
 * validated against the strong-password policy (REQ-BE-010) and the HIBP
 * breach check (REQ-BE-011).
 */
import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password for verification', example: 'OldP@ssword1' })
  @IsString()
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({
    description: 'New password — min 10 chars, must include upper/lower/digit/symbol',
    example: 'NewStr0ng!Pass',
  })
  @IsStrongPassword()
  newPassword!: string;
}
