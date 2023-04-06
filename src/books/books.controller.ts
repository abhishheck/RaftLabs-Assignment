import {
  Body,
  CACHE_MANAGER,
  CacheInterceptor,
  CacheTTL,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Cache } from 'cache-manager';
import { AuthGuard } from 'src/auth/auth.guard';
import { BooksGateway } from './books.gateway';

@Controller('books')
@UseGuards(AuthGuard)
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly bookGateway: BooksGateway,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post()
  async create(@Body() createBookDto: CreateBookDto) {
    const book = await this.booksService.create(createBookDto);
    this.bookGateway.emitShare(book);
    // this.bookGateway.server.emit('share', book);
    await this.invalidateCache();
    return book;
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60 * 1000)
  async findAll(@Query('limit') limit = 10, @Query('page') page = 1) {
    return this.booksService.findAll(page, limit);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60 * 1000)
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    const book = this.booksService.update(id, updateBookDto);
    await this.invalidateCache();
    return book;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }

  private async invalidateCache() {
    const keys = await this.cacheManager.store.keys();
    keys
      .filter((key) => key.startsWith('/books'))
      .forEach(async (key) => {
        await this.cacheManager.del(key);
      });
  }
}
