/* eslint-disable @next/next/no-img-element */

type Variant = "color" | "white" | "flat" | "stacked";
type Mark = "color" | "white";

const SRC: Record<Variant, string> = {
  color: "/brand/logo-color.png", // charcoal + teal, com tagline — fundo claro
  flat: "/brand/logo-color-flat.png", // charcoal + teal, sem tagline
  white: "/brand/logo-white.png", // branca + teal — fundo teal/escuro
  stacked: "/brand/logo-stacked.png",
};

const MARK_SRC: Record<Mark, string> = {
  color: "/brand/symbol-color.png",
  white: "/brand/symbol-white.png",
};

/** Logotipo Risedoc oficial. `height` em px controla o tamanho. */
export function Logo({
  variant = "color",
  height = 32,
  className = "",
}: {
  variant?: Variant;
  height?: number;
  className?: string;
}) {
  return (
    <img
      src={SRC[variant]}
      alt="Risedoc"
      height={height}
      style={{ height }}
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  );
}

/** Apenas o símbolo (R + "="). */
export function LogoMark({
  variant = "color",
  height = 28,
  className = "",
}: {
  variant?: Mark;
  height?: number;
  className?: string;
}) {
  return (
    <img
      src={MARK_SRC[variant]}
      alt="Risedoc"
      height={height}
      style={{ height }}
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  );
}
