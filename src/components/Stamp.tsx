import { FieldSource } from "../state";

export function Stamp({ source }: { source: FieldSource }) {
  if (source === "extracted") {
    return <span className="stamp verify">Verify</span>;
  }
  if (source === "manual") {
    return <span className="stamp manual">Manual</span>;
  }
  return null;
}

export function CalculatedStamp() {
  return <span className="stamp calculated">Calculated</span>;
}
