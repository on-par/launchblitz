import Image from "next/image";

type LaunchBlitzWordmarkProps = {
  className?: string;
  priority?: boolean;
};

export function LaunchBlitzWordmark({
  className = "",
  priority = false,
}: LaunchBlitzWordmarkProps) {
  return (
    <Image
      alt="LaunchBlitz"
      className={className}
      height={48}
      priority={priority}
      src="/brand/launchblitz-wordmark.svg"
      width={228}
    />
  );
}
