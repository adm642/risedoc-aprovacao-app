import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

/**
 * Botão padrão da marca. Renderiza <button> por padrão; passe `href`
 * para renderizar como <Link> com o mesmo visual.
 * Server-component-safe (sem hooks) — handlers só quando usado em client components.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-400",
  secondary:
    "border-[1.5px] border-brand-500 bg-transparent text-brand-900 hover:bg-brand-500/10",
  ghost:
    "border-[1.5px] border-neutral-200 bg-white text-charcoal-900 hover:border-brand-500",
  danger: "bg-status-danger text-white hover:bg-status-danger/85",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-8 px-3 py-1.5 text-[13px]",
  md: "min-h-10 px-5 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    className = "",
    children,
    ...rest
  } = props;
  const cls = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim();

  if (typeof rest.href === "string") {
    const { href, ...anchor } = rest as Omit<ButtonAsLink, keyof CommonProps>;
    return (
      <Link href={href} className={cls} {...anchor}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...button } = rest as Omit<
    ButtonAsButton,
    keyof CommonProps
  >;
  return (
    <button type={type} className={cls} {...button}>
      {children}
    </button>
  );
}

export default Button;
