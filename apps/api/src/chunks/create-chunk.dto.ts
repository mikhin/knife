import { IsString, Length } from "class-validator";

export class CreateChunkDto {
  @IsString()
  @Length(1, 10000)
  text!: string;
}
