import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionQuery } from './dto/query.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  //GET seller transactions
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('seller.transactions.view')
  @Get('seller/payouts')
  async getHostTransactions(@Req() req, @Query() query: TransactionQuery) {
    return this.transactionService.getSellerPayouts(req.user.userId, query);
  }

  //Get User Payments
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('transaction.read')
  @Get('user/payments')
  async getUserPayments(@Req() req, @Query() query: TransactionQuery) {
    return this.transactionService.getUserPayments(req.user.userId, query);
  }

  //GET invoice
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('seller.transactions.view')
  @Get('seller/payouts/:id/invoice')
  async getInvoice(@Param('id') id: string) {
    return this.transactionService.getInvoice(id);
  }

  //Get all transactions
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('admin.transaction.view')
  @Get('all')
  async getAllTransactions(@Query() query: TransactionQuery) {
    return this.transactionService.getAllTransactions(query);
  }
}
