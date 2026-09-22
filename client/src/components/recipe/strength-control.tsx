import { OptionControl, type OptionControlProps } from "./flavor-control";

/**
 * 濃さのコントロール。
 * 後半の投数（phase2_pours）を変えるタイプと、比率そのものを変えるタイプの両方を扱う。
 */
export function StrengthControl(props: OptionControlProps) {
  return <OptionControl {...props} />;
}
