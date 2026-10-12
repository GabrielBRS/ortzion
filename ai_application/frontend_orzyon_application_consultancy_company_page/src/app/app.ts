import { Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly menuOpen = signal(false);
  readonly email = 'gabriel.sousa@orzyon.ai';
  readonly destinations = {
    company: 'https://orzyon.ai/',
    cloud: 'https://cloud.orzyon.ai/',
    financial: 'https://oaifs.orzyon.ai/',
    medical: 'https://oaims.orzyon.ai/',
    portal: 'https://app.orzyon.com',
  };
  readonly services = [
    {
      number: '01',
      mark: '↗',
      title: 'Da ideia ao produto.',
      text: 'Desenvolvimento de produtos digitais e sistemas de IA sob medida, da validação técnica à evolução em produção.',
      tags: ['Software sob medida', 'MVPs', 'APIs e plataformas'],
    },
    {
      number: '02',
      mark: '⌘',
      title: 'IA dentro da operação.',
      text: 'Agentes, RAG privado e sistemas multimodais conectados ao contexto, aos dados e aos processos da sua empresa.',
      tags: ['Agentes de IA', 'LLMs', 'Automação'],
    },
    {
      number: '03',
      mark: '⇄',
      title: 'Seu negócio, conectado.',
      text: 'Integração aos produtos Orzyon e à Orzyon AI Cloud, com arquitetura, implantação e acompanhamento técnico.',
      tags: ['Orzyon AI Cloud', 'Integrações', 'Implantação'],
    },
    {
      number: '04',
      mark: '◇',
      title: 'Uma base para crescer.',
      text: 'Arquitetura de sistemas, inferência privada e infraestrutura de alto desempenho para os requisitos da sua operação.',
      tags: ['Private AI', 'GPU e compute', 'Arquitetura'],
    },
  ];
  readonly steps = [
    {
      title: 'Entender',
      text: 'Conversamos sobre o problema, o estágio do produto e as restrições do negócio.',
    },
    {
      title: 'Desenhar',
      text: 'Definimos arquitetura, entregáveis, prioridades e uma proposta com escopo claro.',
    },
    {
      title: 'Construir',
      text: 'Desenvolvemos junto ao seu time, com validações e entregas acompanháveis.',
    },
    {
      title: 'Evoluir',
      text: 'Apoiamos a implantação, a transferência de conhecimento e os próximos passos.',
    },
  ];
  readonly faqs = [
    {
      question: 'Preciso usar os produtos Orzyon para contratar a consultoria?',
      answer:
        'Não. Podemos desenvolver um produto próprio da sua empresa, trabalhar na sua infraestrutura ou integrar soluções que você já utiliza. O ecossistema Orzyon entra quando faz sentido para o projeto.',
    },
    {
      question: 'Vocês trabalham com um time de tecnologia já existente?',
      answer:
        'Sim. A atuação pode complementar seu time em arquitetura, desenvolvimento, integração e implantação, com responsabilidades e entregáveis definidos na proposta.',
    },
    {
      question: 'Como são definidos o investimento e o prazo?',
      answer:
        'A partir do contexto, da complexidade e dos entregáveis. Após a conversa inicial, alinhamos o escopo e apresentamos uma proposta. Não há um preço ou prazo único para todos os projetos.',
    },
    {
      question: 'É possível executar IA em infraestrutura privada?',
      answer:
        'Sim. Podemos projetar uma arquitetura com modelos self-hosted, inferência privada e recursos dedicados. Os requisitos de dados, acesso e operação são avaliados no desenho da solução.',
    },
  ];
  briefing = {
    name: '',
    company: '',
    email: '',
    service: 'Desenvolvimento de produto',
    message: '',
  };
  readonly prepared = signal(false);
  readonly mailto = signal('');
  prepareBriefing(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    const { name, company, email, service, message } = this.briefing;
    const body = `Olá, Gabriel!\n\nGostaria de conversar sobre um projeto.\n\nNome: ${name.trim()}\nEmpresa: ${company.trim()}\nE-mail: ${email.trim()}\nInteresse: ${service}\n\nContexto do projeto:\n${message.trim()}`;
    this.mailto.set(
      `mailto:${this.email}?subject=${encodeURIComponent(`Consultoria Orzyon — ${company.trim()}`)}&body=${encodeURIComponent(body)}`,
    );
    this.prepared.set(true);
  }
}
