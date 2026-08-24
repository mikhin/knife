import { IsEmail, Length } from "class-validator";

export class InviteDto {
  @IsEmail()
  @Length(3, 320)
  email!: string;
}
