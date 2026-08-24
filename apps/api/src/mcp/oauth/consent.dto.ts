import { IsIn, IsString, Length } from "class-validator";

export class ConsentDto {
  @IsIn(["yes", "no"])
  allow!: string;

  @IsString()
  @Length(1, 4096)
  ticket!: string;

  @IsString()
  @Length(1, 4096)
  to!: string;
}
