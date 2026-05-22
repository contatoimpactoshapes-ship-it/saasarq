import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Você é o assistente do SaasArq, uma plataforma de geração de imagens e vídeos com IA para arquitetos e designers.

Ajude os usuários a:
- Escrever prompts eficazes para gerar imagens arquitetônicas fotorrealistas
- Escolher o modelo de IA ideal para cada tipo de projeto
- Entender os recursos da plataforma (Spaces, ferramentas de imagem, vídeo, áudio, 3D)
- Resolver dúvidas sobre créditos e planos
- Melhorar a qualidade das gerações

Dicas importantes para prompts de imagem arquitetônica:
- Sempre incluir: estilo arquitetônico, materiais, iluminação, perspectiva
- Exemplo: "Modern minimalist living room, floor-to-ceiling windows, white oak floors, warm afternoon light, architectural visualization, 8K photorealistic"
- Para exteriores: incluir clima, hora do dia, contexto urbano/natural
- Para interiores: mencionar mobiliário, texturas, temperatura de cor da luz

Seja objetivo, prático e em português. Máximo de 3 parágrafos por resposta.`;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    }

    // Use Anthropic Claude if available, otherwise return a structured response
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (anthropicKey) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-20240307",
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: message }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.content?.[0]?.text ?? "Não foi possível gerar uma resposta.";
        return NextResponse.json({ reply });
      }
    }

    // Fallback: rule-based responses
    const reply = generateFallbackReply(message);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[POST /api/assistant]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function generateFallbackReply(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("prompt") || m.includes("descrever") || m.includes("escrever")) {
    return "Para prompts de imagem arquitetônica, sempre inclua: estilo (moderno, minimalista, industrial), materiais (mármore, madeira, concreto), iluminação (luz natural, tarde, aconchegante) e perspectiva. Exemplo: \"Modern living room, floor-to-ceiling windows, warm oak floors, afternoon sunlight, photorealistic 8K render\".";
  }

  if (m.includes("modelo") || m.includes("model") || m.includes("qual")) {
    return "Para imagens rápidas use o modelo Auto (50 cr). Para máxima qualidade fotorrealista use Nano Banana Pro (150 cr) ou Flux.2 Pro (120 cr). Para vídeos, o Kling 2.5 oferece ótima qualidade com custo razoável. Recomendo começar com Auto e usar os modelos premium quando precisar de qualidade para apresentações.";
  }

  if (m.includes("crédito") || m.includes("plano") || m.includes("preço")) {
    return "O plano Essential (R$10/mês) oferece 8.000 créditos mensais — suficiente para ~160 imagens com o modelo Auto. O Premium (R$20/mês) tem 20.000 créditos. Para uso intenso, o Premium+ (R$45/mês) inclui gerações ilimitadas em modelos selecionados. Veja todos os planos em /pricing.";
  }

  if (m.includes("iluminação") || m.includes("luz") || m.includes("light")) {
    return "Para controlar a iluminação nos prompts, use termos específicos: \"warm golden hour light\" para pôr do sol aconchegante, \"soft diffused daylight\" para luz natural suave, \"dramatic studio lighting\" para renders de produto. Evite apenas dizer \"boa iluminação\" — quanto mais específico, melhor o resultado.";
  }

  return "Posso ajudar com prompts, escolha de modelos, dicas de criação e dúvidas sobre a plataforma. Faça uma pergunta específica e terei prazer em orientar!";
}
