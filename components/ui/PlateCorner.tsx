export function PlateCorner({ number }: { number: string | number }) {
  return (
    <div className="absolute top-4 right-4 inline-flex items-baseline gap-2 font-serif italic text-ink-3 z-10 pointer-events-none">
      <span className="caps">Plate</span>
      <span className="not-italic font-medium text-plate text-[22px] border border-plate px-2 leading-tight">
        № {String(number).padStart(2, "0")}
      </span>
    </div>
  );
}
