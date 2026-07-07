import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class CustomValidationPipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    // Scaffold: basic pass-through validation
    if (value === null || value === undefined) {
      throw new BadRequestException('Validation failed: no data provided');
    }
    return value;
  }
}
