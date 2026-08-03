export default function NoteEtoiles({ note }: { note: number }) {
  const noteArrondie = Math.round(note);
  return (
    <span className="inline-flex items-center gap-1">
      <span className="tracking-tighter">
        {[1, 2, 3, 4, 5].map((etoile) => (
          <span key={etoile} className={etoile <= noteArrondie ? "text-colimo-rouge" : "text-colimo-neutre-clair"}>
            ★
          </span>
        ))}
      </span>
      <span className="text-xs text-colimo-neutre-fonce/60">{note > 0 ? note.toFixed(1) : "—"}</span>
    </span>
  );
}
