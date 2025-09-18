import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionQuery } from './dto/query.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  //GET host transactions
  @Get('host')
  @UseGuards(AuthGuard('jwt'))
  async getHostTransactions(@Req() req, @Query() query: TransactionQuery) {
    return this.transactionService.getHostTransactions(req.user.userId, query);
  }

  //GET invoice
  @Get('host/:id/invoice')
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
