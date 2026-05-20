import type { JSX } from "solid-js";

type IconProps = Readonly<{
  class?: string;
  title?: string;
}>;

function iconClassName(extra?: string): string {
  return extra ? `ui-icon ${extra}` : "ui-icon";
}

function strokeProps(): JSX.SvgSVGAttributes<SVGSVGElement> {
  return {
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 1.8,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  };
}

function IconBase(props: Readonly<IconProps & { children: JSX.Element; viewBox?: string }>) {
  return (
    <svg
      class={iconClassName(props.class)}
      viewBox={props.viewBox ?? "0 0 24 24"}
      aria-hidden={props.title ? undefined : "true"}
    >
      {props.title ? <title>{props.title}</title> : null}
      {props.children}
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <g {...strokeProps()}>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 2.8v2.4m0 13.6v2.4M4.9 4.9l1.7 1.7m10.8 10.8 1.7 1.7M2.8 12h2.4m13.6 0h2.4M4.9 19.1l1.7-1.7m10.8-10.8 1.7-1.7" />
      </g>
    </IconBase>
  );
}

export function HideTrayIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <g {...strokeProps()}>
        <path d="M12 3.5v11.5" />
        <path d="m8.4 11.3 3.6 3.7 3.6-3.7" />
        <path d="M4 17.5h16l-1.7 3H5.7z" />
      </g>
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path {...strokeProps()} d="m5.2 12.5 4.3 4.2L18.8 7.8" />
    </IconBase>
  );
}

export function XIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path {...strokeProps()} d="m6 6 12 12M18 6 6 18" />
    </IconBase>
  );
}

export function CircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle {...strokeProps()} cx="12" cy="12" r="6.3" />
    </IconBase>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path {...strokeProps()} d="m6.5 9.5 5.5 5 5.5-5" />
    </IconBase>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path {...strokeProps()} d="m9.5 6.5 5 5.5-5 5.5" />
    </IconBase>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <g {...strokeProps()}>
        <rect x="9" y="9" width="10" height="10" rx="2.2" />
        <path d="M7.5 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1.5" />
      </g>
    </IconBase>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <g {...strokeProps()}>
        <path d="M20 7v4h-4" />
        <path d="M4 17v-4h4" />
        <path d="M7.2 9a7 7 0 0 1 11.5-2M16.8 15a7 7 0 0 1-11.5 2" />
      </g>
    </IconBase>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <g {...strokeProps()}>
        <path d="M4.8 7h14.4" />
        <path d="M9.5 7V5.3h5V7" />
        <path d="M7.2 7 8 19h8l.8-12" />
        <path d="M10.3 10.5v6.2m3.4-6.2v6.2" />
      </g>
    </IconBase>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <g {...strokeProps()}>
        <path d="m12 4 8.1 14H3.9z" />
        <path d="M12 9.1v4.7m0 3.3h.01" />
      </g>
    </IconBase>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <g {...strokeProps()}>
        <rect x="5.5" y="10.5" width="13" height="9" rx="2.1" />
        <path d="M8.5 10.5V8.2A3.5 3.5 0 0 1 12 4.7a3.5 3.5 0 0 1 3.5 3.5v2.3" />
      </g>
    </IconBase>
  );
}
