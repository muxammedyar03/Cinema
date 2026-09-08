import { SetMetadata } from "@nestjs/common";

export const ALLOW_WHEN_LOCKED_KEY = "allowWhenLocked";
export const AllowWhenLocked = () => SetMetadata(ALLOW_WHEN_LOCKED_KEY, true);
