import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { PosAuthGuard } from './guards/pos-auth.guard';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [PosController],
  providers: [PosService, PosAuthGuard],
  exports: [PosService],
})
export class PosModule {}
