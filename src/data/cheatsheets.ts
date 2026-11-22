import { renderBlockFormulaHtml, renderInlineMathTextToHtml } from "@/utils/katexStatic";

export interface CheatsheetItem {
  lead?: string;
  bodyHtml: string;
}

export interface CheatsheetSection {
  id: string;
  title: string;
  variant?: "default" | "warning";
  formulaHtml?: string;
  listType: "ul" | "ol";
  items: CheatsheetItem[];
}

function buildTdaCheatsheetSections(): CheatsheetSection[] {
  return [
    {
      id: "teorema-maestro",
      title: "1. Teorema Maestro (División y Conquista)",
      formulaHtml: renderBlockFormulaHtml(
        String.raw`T(n) = a \cdot T(n/b) + \Theta(n^c) \quad (a \ge 1, \; b > 1, \; c \ge 0)`,
      ),
      listType: "ul",
      items: [
        {
          lead: "Caso 1 (Hojas dominan):",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Si $\log_b a > c \implies T(n) = \Theta(n^{\log_b a})$`,
          ),
        },
        {
          lead: "Caso 2 (Balance):",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Si $\log_b a = c \implies T(n) = \Theta(n^c \log n)$`,
          ),
        },
        {
          lead: "Caso 3 (Raíz domina):",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Si $\log_b a < c \implies T(n) = \Theta(n^c)$ (con $a \cdot f(n/b) \le k \cdot f(n)$)`,
          ),
        },
      ],
    },
    {
      id: "esquema-npc",
      title: "2. Esquema de 4 Pasos Obligatorios para NP-C",
      listType: "ol",
      items: [
        {
          lead: "Certificado y Verificador en NP:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Definir certificado polinomial $C$ y verificador $V(I_B, C)$ en tiempo $O(n^k)$.`,
          ),
        },
        {
          lead: "Problema conocido en NPC:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Seleccionar problema base $A \in \text{NPC}$ (Vertex Cover, 3-SAT, Ciclo Ham, Subset Sum) y reducir $A \le_P B$.`,
          ),
        },
        {
          lead: "Transformación polinomial:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Definir $f(I_A) \to I_B$ computable en tiempo polinomial.`,
          ),
        },
        {
          lead: "Demostración Bidireccional:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Ida ($I_A \in \text{YES}_A \implies f(I_A) \in \text{YES}_B$) y Vuelta ($f(I_A) \in \text{YES}_B \implies I_A \in \text{YES}_A$).`,
          ),
        },
      ],
    },
    {
      id: "pasos-dp",
      title: "3. Los 5 Pasos de Programación Dinámica",
      listType: "ol",
      items: [
        {
          lead: "Definición semántica del Estado:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Explicar con palabras qué significa $OPT(i, w)$.`,
          ),
        },
        {
          lead: "Casos Base:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Inicializar explícitamente celdas triviales y estados infactibles ($-\infty$ o $+\infty$).`,
          ),
        },
        {
          lead: "Ecuación de Recurrencia:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Decisión local, ej. $OPT(i, w) = \max\big(OPT(i-1, w), \; OPT(i-1, w - w_i) + v_i\big)$.`,
          ),
        },
        {
          lead: "Orden de Llenado:",
          bodyHtml: renderInlineMathTextToHtml(
            "Especificar dirección bottom-up (filas crecientes, columnas crecientes).",
          ),
        },
        {
          lead: "Algoritmo de Reconstrucción:",
          bodyHtml: renderInlineMathTextToHtml(
            "Rastrear las decisiones hacia atrás en la tabla para devolver los ítems.",
          ),
        },
      ],
    },
    {
      id: "reglas-pli",
      title: "4. Reglas de Oro de Programación Lineal (PLI)",
      listType: "ul",
      items: [
        {
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Definir variables de decisión con su dominio explícito ($x_i \in \{0, 1\}$ o $y_j \ge 0$).`,
          ),
        },
        {
          lead: "Prohibido:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Multiplicar variables de decisión ($x_i \cdot y_j$ anula el ejercicio; usar acotación con Big-$M$).`,
          ),
        },
        {
          lead: "Linealizar Min-Max / Max-Min:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`$\min Z$ sujeto a $Z \ge f_i(x)$ para todo $i$.`,
          ),
        },
        {
          bodyHtml: renderInlineMathTextToHtml(
            "Contar explícitamente cantidad de variables y restricciones en función de la entrada.",
          ),
        },
      ],
    },
    {
      id: "redes-flujo",
      title: "5. Redes de Flujo (Ford-Fulkerson / Edmonds-Karp)",
      listType: "ul",
      items: [
        {
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Construir super-fuente $s$ y super-sumidero $t$ para entradas/salidas múltiples.`,
          ),
        },
        {
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Capacidades en aristas dirigidas. Red residual $G_f$ con aristas backward de capacidad $c_f(v, u) = f(u, v)$.`,
          ),
        },
        {
          lead: "Teorema Max-Flow Min-Cut:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`$|f^*| = C(A, B) = \sum_{u \in A, v \in B} c(u, v)$.`,
          ),
        },
        {
          lead: "Teorema de Integralidad:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Capacidades enteras garantizan flujo entero $f(e) \in \mathbb{Z}_{\ge 0}$.`,
          ),
        },
      ],
    },
    {
      id: "errores-prohibidos",
      title: "Errores Prohibidos que Anulan el Ejercicio",
      variant: "warning",
      listType: "ul",
      items: [
        {
          lead: "Reducir al revés en NP-C:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Jamás hagas $B \le_P A$. Siempre $A_{\text{conocido}} \le_P B_{\text{nuevo}}$.`,
          ),
        },
        {
          lead: "Afirmar optimalidad en Greedy sin prueba:",
          bodyHtml: renderInlineMathTextToHtml(
            "Requiere inducción por Greedy Stays Ahead o Argumento de Intercambio.",
          ),
        },
        {
          lead: "Olvidar casos base en DP:",
          bodyHtml: renderInlineMathTextToHtml(
            String.raw`Asumir $0$ en estados infactibles corrompe la solución.`,
          ),
        },
        {
          lead: "Omitir aristas residuales backward en Flujo:",
          bodyHtml: renderInlineMathTextToHtml(
            "No es Ford-Fulkerson sin ellas.",
          ),
        },
      ],
    },
  ];
}

const COURSE_CHEATSHEETS: Record<string, () => CheatsheetSection[]> = {
  tda: buildTdaCheatsheetSections,
};

export function getCheatsheetSections(courseId: string): CheatsheetSection[] {
  const builder = COURSE_CHEATSHEETS[courseId];
  return builder ? builder() : [];
}
