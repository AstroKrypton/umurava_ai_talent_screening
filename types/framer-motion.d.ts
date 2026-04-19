declare module "framer-motion" {
  import type { ReactNode, HTMLAttributes, ForwardRefExoticComponent, RefAttributes } from "react";

  export type MotionTransition = {
    type?: string;
    stiffness?: number;
    damping?: number;
    duration?: number;
    delay?: number;
  };

  export type MotionProps = HTMLAttributes<HTMLElement> & {
    layoutId?: string;
    transition?: MotionTransition;
  };

  export interface LayoutGroupProps {
    id?: string;
    children: ReactNode;
  }

  export const LayoutGroup: ({ id, children }: LayoutGroupProps) => JSX.Element;

  export const motion: {
    span: ForwardRefExoticComponent<MotionProps & RefAttributes<HTMLSpanElement>>;
    div: ForwardRefExoticComponent<MotionProps & RefAttributes<HTMLDivElement>>;
  };
}
