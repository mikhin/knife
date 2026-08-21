import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class LintItemDto {
  @IsString()
  id!: string;

  @IsString()
  @MaxLength(10000)
  text!: string;
}

export class LintRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => LintItemDto)
  items!: LintItemDto[];
}
