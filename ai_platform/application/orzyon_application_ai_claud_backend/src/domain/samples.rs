//! Exemplos de código e respostas predefinidas do playground,
//! portados de `src/mock/samples.ts`. Nunca são executados.

pub const SAMPLE_CODE_PYTHON: &str = r#"# app.py — serviço HTTP de exemplo (não é executado na demonstração)
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
"#;

pub const SAMPLE_CODE_MOJO: &str = r#"# main.mojo — kernel de similaridade de exemplo (não é executado na demonstração)
fn dot(a: List[Float32], b: List[Float32]) -> Float32:
    var total: Float32 = 0
    for i in range(len(a)):
        total += a[i] * b[i]
    return total

fn main():
    var a = List[Float32](1.0, 2.0, 3.0)
    var b = List[Float32](0.5, 0.25, 0.125)
    print("similaridade:", dot(a, b))
"#;

pub const SAMPLE_CODE_PYTHON_MOJO: &str = r#"# main.py — Python orquestra; a parte crítica fica em Mojo (exemplo, não executado)
# O módulo "tokenizer_fast" seria implementado em Mojo (tokenizer_fast.mojo).
# Apenas o código escrito em Mojo é acelerado; o restante continua em Python.
from tokenizer_fast import split_pages  # implementado em Mojo

def handle(document: bytes) -> dict:
    pages = split_pages(document)
    return {"pages": len(pages)}

if __name__ == "__main__":
    print(handle(b"exemplo"))
"#;

/// Respostas predefinidas do playground, escolhidas pela finalidade do agente.
pub fn canned_reply(agent_name: &str, description: &str, tags: &[String], question: &str) -> String {
    let text = format!("{} {} {}", agent_name, description, tags.join(" ")).to_lowercase();
    let q = question.trim();
    let has = |pats: &[&str]| pats.iter().any(|p| text.contains(p));
    if has(&["contrat", "juríd", "jurid"]) {
        return format!(
            "Analisei o trecho enviado (\"{}\"{}). Pontos de atenção de exemplo:\n\n1. Cláusula de renovação automática sem prazo de aviso definido.\n2. Multa rescisória acima do padrão interno de exemplo.\n3. Ausência de cláusula de confidencialidade.\n\nRecomendo revisão humana antes de qualquer decisão.",
            &q[..q.floor_char_boundary(60)],
            if q.chars().count() > 60 { "…" } else { "" }
        );
    }
    if has(&["tribut", "fiscal", "receita"]) {
        return "Com base na legislação de exemplo cadastrada, a orientação geral é:\n\n• Verifique o enquadramento do documento.\n• Confira prazos no calendário de exemplo.\n\nEsta é uma resposta simulada para demonstração e não constitui orientação oficial.".to_string();
    }
    if has(&["código", "codigo", "engenharia"]) {
        return "Segue uma sugestão de exemplo:\n\n```python\ndef normalizar(texto: str) -> str:\n    return \" \".join(texto.split()).lower()\n```\n\nSe a função estiver no caminho crítico, ela pode ser reescrita em Mojo e chamada a partir do Python.".to_string();
    }
    if has(&["triagem", "chamad", "suporte"]) {
        return "Classificação sugerida: prioridade **alta**, equipe **Infraestrutura**. Motivo: menção a indisponibilidade em produção. Rota aplicada: \"prioridade = crítica\" não atendida; enviado para a fila geral.".to_string();
    }
    if has(&["indicador", "econom", "relatório", "relatorio", "resumo"]) {
        return "Resumo dos dados de exemplo:\n\n• O indicador A subiu 2,1% no trimestre de exemplo.\n• O indicador B manteve-se estável.\n• Recomenda-se acompanhar a série mensal antes de conclusões.".to_string();
    }
    if has(&["jurisprud", "acórd", "pesquisa"]) {
        return "Encontrei 3 documentos de exemplo relacionados ao tema. O mais relevante trata do mesmo assunto em contexto semelhante. Os documentos são fictícios e servem apenas para demonstração.".to_string();
    }
    format!(
        "Olá! Recebi sua mensagem: \"{}\". Esta é uma resposta simulada do agente {}, coerente com sua finalidade: {}",
        &q[..q.floor_char_boundary(80)],
        agent_name,
        description.to_lowercase()
    )
}
