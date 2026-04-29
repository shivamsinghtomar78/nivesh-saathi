import { cn } from "@/lib/utils";

type AnswerBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

const headingWithTextPattern =
  /^([A-Za-z][A-Za-z0-9 /&().-]{2,42}):\s*(.+)$/;

function cleanLine(value: string) {
  return value
    .replace(/^\s*[-*]\s*/, "- ")
    .trim();
}

function prepareText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(
      /\s+(Summary|Recommendation|Top options|Safety|What this means|Next step|Important|Rates|Why it matters):/gi,
      "\n$1:"
    )
    .trim();
}

function parseAnswer(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  let pendingList: string[] = [];

  const flushList = () => {
    if (pendingList.length > 0) {
      blocks.push({ type: "list", items: pendingList });
      pendingList = [];
    }
  };

  for (const rawLine of prepareText(text).split("\n")) {
    const line = cleanLine(rawLine);

    if (!line) {
      flushList();
      continue;
    }

    const bullet = line.match(/^(?:[-*]|\d+[.)])\s+(.+)$/);
    if (bullet) {
      pendingList.push(bullet[1].trim());
      continue;
    }

    flushList();

    const headingWithText = line.match(headingWithTextPattern);
    if (headingWithText) {
      blocks.push({ type: "heading", text: headingWithText[1].trim() });
      blocks.push({ type: "paragraph", text: headingWithText[2].trim() });
      continue;
    }

    if (line.endsWith(":") && line.length <= 48) {
      blocks.push({ type: "heading", text: line.slice(0, -1).trim() });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  flushList();
  return blocks;
}

function parseInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-text-strong">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

type StructuredAnswerProps = {
  text: string;
  className?: string;
  compact?: boolean;
};

export default function StructuredAnswer({
  className,
  compact = false,
  text,
}: StructuredAnswerProps) {
  const blocks = parseAnswer(text);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2", className)}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <p
              key={`${block.type}-${index}`}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-highlight"
            >
              {block.text}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul
              key={`${block.type}-${index}`}
              className="grid gap-2 text-sm leading-6 text-text-strong"
            >
              {block.items.map((item, itemIndex) => (
                <li
                  key={`${item}-${itemIndex}`}
                  className="flex gap-3 rounded-2xl border border-outline bg-app/70 px-3 py-2"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-highlight" />
                  <span>{parseInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={`${block.type}-${index}`}
            className={cn(
              "text-sm leading-7 text-text-strong",
              !compact && "md:text-base"
            )}
          >
            {parseInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
