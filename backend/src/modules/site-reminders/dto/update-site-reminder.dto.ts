import { PartialType } from '@nestjs/mapped-types';
import { CreateSiteReminderDto } from './create-site-reminder.dto';

export class UpdateSiteReminderDto extends PartialType(CreateSiteReminderDto) {}
