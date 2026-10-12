// Exemplos de código exibidos no fluxo "Implantar serviço". Nunca são executados.

export const SAMPLE_CODE = {
  python: `# app.py — serviço HTTP de exemplo (não é executado na demonstração)
from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"status": "ok"}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
`,
  mojo: `# main.mojo — kernel de similaridade de exemplo (não é executado na demonstração)
fn dot(a: List[Float32], b: List[Float32]) -> Float32:
    var total: Float32 = 0
    for i in range(len(a)):
        total += a[i] * b[i]
    return total

fn main():
    var a = List[Float32](1.0, 2.0, 3.0)
    var b = List[Float32](0.5, 0.25, 0.125)
    print("similaridade:", dot(a, b))
`,
  python_mojo: `# main.py — Python orquestra; a parte crítica fica em Mojo (exemplo, não executado)
# O módulo "tokenizer_fast" seria implementado em Mojo (tokenizer_fast.mojo).
# Apenas o código escrito em Mojo é acelerado; o restante continua em Python.
from tokenizer_fast import split_pages  # implementado em Mojo

def handle(document: bytes) -> dict:
    pages = split_pages(document)
    return {"pages": len(pages)}

if __name__ == "__main__":
    print(handle(b"exemplo"))
`,
} as const

export const RUNTIME_LABEL = {
  python: 'Python',
  mojo: 'Mojo',
  python_mojo: 'Python + Mojo',
} as const

export const RUNTIME_DEFAULTS = {
  python: { fileName: 'app.py', command: 'python app.py' },
  mojo: { fileName: 'main.mojo', command: 'mojo run main.mojo' },
  python_mojo: { fileName: 'main.py', command: 'python main.py' },
} as const

/** Respostas predefinidas do playground, escolhidas pela finalidade do agente. */
export function cannedReply(agentName: string, description: string, tags: string[], question: string): string {
  const text = `${agentName} ${description} ${tags.join(' ')}`.toLowerCase()
  const q = question.trim()
  if (/contrat|jur[ií]d/.test(text))
    return `Analisei o trecho enviado ("${q.slice(0, 60)}${q.length > 60 ? '…' : ''}"). Pontos de atenção de exemplo:\n\n1. Cláusula de renovação automática sem prazo de aviso definido.\n2. Multa rescisória acima do padrão interno de exemplo.\n3. Ausência de cláusula de confidencialidade.\n\nRecomendo revisão humana antes de qualquer decisão.`
  if (/tribut|fiscal|receita/.test(text))
    return `Com base na legislação de exemplo cadastrada, a orientação geral é:\n\n• Verifique o enquadramento do documento.\n• Confira prazos no calendário de exemplo.\n\nEsta é uma resposta simulada para demonstração e não constitui orientação oficial.`
  if (/c[oó]digo|engenharia/.test(text))
    return 'Segue uma sugestão de exemplo:\n\n```python\ndef normalizar(texto: str) -> str:\n    return " ".join(texto.split()).lower()\n```\n\nSe a função estiver no caminho crítico, ela pode ser reescrita em Mojo e chamada a partir do Python.'
  if (/triagem|chamad|suporte/.test(text))
    return 'Classificação sugerida: prioridade **alta**, equipe **Infraestrutura**. Motivo: menção a indisponibilidade em produção. Rota aplicada: "prioridade = crítica" não atendida; enviado para a fila geral.'
  if (/indicador|econom|relat[oó]rio|resumo/.test(text))
    return 'Resumo dos dados de exemplo:\n\n• O indicador A subiu 2,1% no trimestre de exemplo.\n• O indicador B manteve-se estável.\n• Recomenda-se acompanhar a série mensal antes de conclusões.'
  if (/jurisprud|acórd|pesquisa/.test(text))
    return 'Encontrei 3 documentos de exemplo relacionados ao tema. O mais relevante trata do mesmo assunto em contexto semelhante. Os documentos são fictícios e servem apenas para demonstração.'
  return `Olá! Recebi sua mensagem: "${q.slice(0, 80)}". Esta é uma resposta simulada do agente ${agentName}, coerente com sua finalidade: ${description.toLowerCase()}`
}
