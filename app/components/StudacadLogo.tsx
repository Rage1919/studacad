type StudacadLogoProps = {
  alt?: string;
  className?: string;
  variant?: "navy" | "white";
};

export function StudacadLogo({
  alt = "Studacad",
  className = "",
  variant = "navy",
}: StudacadLogoProps) {
  const classes = ["studacad-logo", className].filter(Boolean).join(" ");

  return (
    <img
      alt={alt}
      className={classes}
      draggable={false}
      height="71"
      src={
        variant === "white"
          ? "/images/studacad-logo-white.png"
          : "/images/studacad-logo.png"
      }
      width="331"
    />
  );
}
