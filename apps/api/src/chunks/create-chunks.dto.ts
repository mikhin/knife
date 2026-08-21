import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateChunksDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20000)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  texts!: string[];
}
