import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('Orzyon Consulting', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('renders the services and working internal navigation targets', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Sua próxima ideia.');
    expect(page.querySelectorAll('.service-card')).toHaveLength(4);
    for (const link of page.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
      if (link.hash) expect(page.querySelector(link.hash)).not.toBeNull();
    }
  });

  it('rejects an empty briefing without preparing an email', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.prepared()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('prepares an encoded email draft with the entered project context', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const values: Record<string, string> = {
      name: 'Ana Silva',
      company: 'Empresa & Parceiros',
      email: 'ana@example.com',
      message: 'Precisamos integrar agentes à nossa plataforma de atendimento.',
    };
    for (const [id, value] of Object.entries(values)) {
      const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.prepared()).toBe(true);
    const draft = new URL(fixture.componentInstance.mailto());
    expect(draft.pathname).toBe('gabriel.sousa@orzyon.ai');
    expect(draft.searchParams.get('subject')).toBe('Consultoria Orzyon — Empresa & Parceiros');
    expect(draft.searchParams.get('body')).toContain(values['message']);
    expect(draft.searchParams.get('body')).toContain('ana@example.com');
    const input = fixture.nativeElement.querySelector('#name') as HTMLInputElement;
    input.value = 'Outro nome';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.prepared()).toBe(false);
  });
});
