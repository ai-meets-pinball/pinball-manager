import { Fragment } from "react";
import { parseMarkdown, type Inline } from "@/lib/mini-markdown";

/*
  Renderer für die Basis-Formatierung der Tipp-Texte (Parser: lib/mini-markdown).
  Gibt ausschließlich React-Elemente aus — nie HTML aus Nutzertext — daher ohne
  XSS-Risiko. Links öffnen in neuem Tab und tragen rel=nofollow/noopener.
  Serverseitig nutzbar (keine Hooks).
*/
function renderInline(nodes: Inline[], key: string) {
  return nodes.map((n, i) => {
    const k = `${key}-${i}`;
    if (n.t === "text") return <Fragment key={k}>{n.wert}</Fragment>;
    if (n.t === "fett")
      return <strong key={k}>{renderInline(n.kinder, k)}</strong>;
    if (n.t === "kursiv") return <em key={k}>{renderInline(n.kinder, k)}</em>;
    return (
      <a
        key={k}
        href={n.href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="break-words text-[var(--color-primary)] underline underline-offset-2 hover:opacity-80"
      >
        {renderInline(n.kinder, k)}
      </a>
    );
  });
}

export function FormatierterText({
  text,
  className = "space-y-2 text-sm",
}: {
  text: string;
  className?: string;
}) {
  const bloecke = parseMarkdown(text);
  return (
    <div className={className}>
      {bloecke.map((b, i) =>
        b.t === "absatz" ? (
          <p key={i} className="whitespace-pre-line break-words">
            {renderInline(b.inhalt, `p${i}`)}
          </p>
        ) : (
          <ul key={i} className="list-disc space-y-0.5 pl-5">
            {b.punkte.map((p, j) => (
              <li key={j}>{renderInline(p, `l${i}-${j}`)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
