import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionQuery } from './dto/query.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  //GET seller transactions
  @Get('seller/payouts')
  @UseGuards(AuthGuard('jwt'))
  async getHostTransactions(@Req() req, @Query() query: TransactionQuery) {
    return this.transactionService.getSellerPayouts(req.user.userId, query);
  }

  //Get User Payments
  @Get('user/payments')
  @UseGuards(AuthGuard('jwt'))
  async getUserPayments(@Req() req, @Query() query: TransactionQuery) {
    return this.transactionService.getUserPayments(req.user.userId, query);
  }

  //GET invoice
  @Get('seller/payouts/:id/invoice')
  @UseGuards(AuthGuard('jwt'))
  async getInvoice(@Param('id') id: string) {
    return this.transactionService.getInvoice(id);
  }

  //Get all transactions
  @Get('all')
  @UseGuards(AuthGuard('jwt'))
  async getAllTransactions(@Query() query: TransactionQuery) {
    return this.transactionService.getAllTransactions(query);
  }
}
