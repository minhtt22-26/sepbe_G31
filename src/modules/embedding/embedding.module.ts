import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import embeddingConfig from 'src/config/embedding.config'
import { EmbeddingService } from './service/embedding.service'
import { EmbeddingTextBuilder } from './builder/embedding-text.builder'

@Module({
  imports: [ConfigModule.forFeature(embeddingConfig)],
  providers: [EmbeddingService, EmbeddingTextBuilder],
  exports: [EmbeddingService, EmbeddingTextBuilder],
})
export class EmbeddingModule {}
