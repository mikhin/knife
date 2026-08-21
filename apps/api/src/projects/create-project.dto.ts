import { IsString, Length } from "class-validator";

export class CreateProjectDto {
  @IsString()
  @Length(1, 200)
  name!: string;
}
