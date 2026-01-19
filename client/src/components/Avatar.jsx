import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";
import { cn } from "../lib/utils.js";

const Avatar = ({ seed, size = 40, background = "#eef2ff", className }) => {
  const svg = createAvatar(avataaars, {
    seed: seed || "splitmint",
    backgroundColor: [background.replace("#", "")]
  }).toDataUriSync();

  const initials = (seed || "SM")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AvatarPrimitive.Root
      className={cn("relative flex shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      <AvatarPrimitive.Image className="aspect-square h-full w-full" src={svg} alt="avatar" />
      <AvatarPrimitive.Fallback
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{ background }}
      >
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
};

export default Avatar;
