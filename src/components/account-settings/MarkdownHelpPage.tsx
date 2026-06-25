import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MarkdownText } from "@/lib/markdown";

interface Example {
  source: string;
  note?: string;
}

interface Section {
  title: string;
  description?: string;
  examples: Example[];
}

const SECTIONS: Section[] = [
  {
    title: "Titres",
    description:
      "Utilisez # pour les titres. Plus il y a de #, plus le titre est petit. -# crée un texte discret (légende).",
    examples: [
      { source: "# Titre 1" },
      { source: "## Titre 2" },
      { source: "### Titre 3" },
      { source: "-# Texte discret (légende)" },
    ],
  },
  {
    title: "Style de texte",
    description: "Combinez les marqueurs pour styliser un mot, une phrase ou un paragraphe entier.",
    examples: [
      { source: "**Gras**" },
      { source: "*Italique*" },
      { source: "__Souligné__" },
      { source: "~~Barré~~" },
      { source: "***Gras italique***" },
      { source: "||Spoiler caché||" },
    ],
  },
  {
    title: "Code en ligne et blocs de code",
    description:
      "Encadrez du code en ligne avec un accent grave `. Un bloc de code utilise trois accents graves, optionnellement suivis d'un langage pour activer la coloration syntaxique.",
    examples: [
      { source: "Le code en ligne : `const x = 42;`" },
      {
        source: "```ts\nfunction hello(name: string) {\n  return `Hello, ${name}`;\n}\n```",
        note: "Langages supportés : ts, tsx, js, jsx, json, py, rb, go, rs, sh, sql, html, css, md, yaml, etc.",
      },
      { source: "```\nBloc sans coloration\n```" },
    ],
  },
  {
    title: "Citations",
    description: "> pour une seule ligne, >>> pour citer tout ce qui suit jusqu'à la fin du message.",
    examples: [
      { source: "> Citation sur une ligne" },
      { source: ">>> Citation\nmulti-ligne\nqui continue" },
    ],
  },
  {
    title: "Listes",
    description: "Préfixez avec - ou un chiffre suivi d'un point. Indentez de 2 espaces pour imbriquer.",
    examples: [
      { source: "- Premier élément\n- Second élément\n  - Sous-élément\n  - Sous-élément" },
      { source: "1. Étape une\n2. Étape deux\n3. Étape trois" },
    ],
  },
  {
    title: "Liens",
    description:
      "Utilisez [texte](url) pour masquer l'URL derrière un libellé. Entourez l'URL de <…> pour empêcher l'aperçu intégré.",
    examples: [
      { source: "[Visiter le site](https://exemple.com)" },
      { source: "<https://exemple.com> (pas d'aperçu)" },
    ],
  },
  {
    title: "Mentions et emojis",
    description: "Mentionnez un utilisateur, un salon ou un rôle. Les emojis personnalisés utilisent leur nom court.",
    examples: [
      { source: "@utilisateur — mention directe" },
      { source: "#salon — lien vers un salon" },
      { source: ":smile: — emoji par nom" },
    ],
  },
  {
    title: "Encadrés (alertes)",
    description: "Ouvrez une citation avec un type d'alerte pour mettre en valeur un message.",
    examples: [
      { source: "> [!NOTE]\n> Bon à savoir." },
      { source: "> [!TIP]\n> Astuce utile." },
      { source: "> [!IMPORTANT]\n> Information importante." },
      { source: "> [!WARNING]\n> Faites attention." },
      { source: "> [!CAUTION]\n> Action potentiellement dangereuse." },
    ],
  },
];

export function MarkdownHelpPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Guide Markdown</CardTitle>
          <CardDescription>
            Mettez en forme vos messages en combinant ces marqueurs. Chaque exemple montre le code source à gauche et le
            rendu final à droite.
          </CardDescription>
        </CardHeader>
      </Card>

      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
            {section.description && (
              <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {section.examples.map((ex, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/30 border border-border/40"
              >
                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground bg-background/60 rounded-xl p-3 border border-border/30">
                  {ex.source}
                </pre>
                <div className="text-sm leading-relaxed bg-background/60 rounded-xl p-3 border border-border/30">
                  <MarkdownText text={ex.source} />
                </div>
                {ex.note && <p className="md:col-span-2 text-[11px] text-muted-foreground">{ex.note}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
