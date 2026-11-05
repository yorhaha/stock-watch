import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5.5v13M5.5 12h13" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="10.8" cy="10.8" r="6.2" />
      <path d="m15.5 15.5 4 4" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </IconBase>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M13.4 5.6 18.4 10.6M4.8 19.2l1-4.6L16.6 3.8a1.6 1.6 0 0 1 2.2 0l1.4 1.4a1.6 1.6 0 0 1 0 2.2L9.4 18.2l-4.6 1Z" />
      <path d="M13.9 6.1 17.9 10.1" />
    </IconBase>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </IconBase>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m7 9.5 5 5 5-5" />
    </IconBase>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m7 14.5 5-5 5 5" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5.5 12.5 4 4 9-9" />
    </IconBase>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 7h15M9.5 7V4.8h5V7M7 7l.7 12.2h8.6L17 7M10.2 10.5v5.2M13.8 10.5v5.2" />
    </IconBase>
  );
}

export function GripIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="7" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="9" cy="17" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.2 21 20H3L12 4.2Z" />
      <path d="M12 9.2v4.6M12 17.2v.1" />
    </IconBase>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19.2 8.5A7.7 7.7 0 1 0 19 15M19.2 4.8v3.7h-3.7" />
    </IconBase>
  );
}

export function SortIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8.5 5.5v13M5.8 15.8l2.7 2.7 2.7-2.7M15.5 18.5v-13M12.8 8.2l2.7-2.7 2.7 2.7" />
    </IconBase>
  );
}

export function ListPlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 6.5h9M4.5 12h9M4.5 17.5h6" />
      <path d="M17.5 12v6M14.5 15h6" />
    </IconBase>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19 12H5M10 7l-5 5 5 5" />
    </IconBase>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m9.5 7 5 5-5 5" />
    </IconBase>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6.8 4.6h10.4v14.9L12 15.6l-5.2 3.9V4.6Z" />
    </IconBase>
  );
}
