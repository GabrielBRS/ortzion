import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ConteudoService } from '../../core/i18n/conteudo-service';

@Component({
  selector: 'app-contato',
  templateUrl: './contato.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contato {
  protected readonly cs = inject(ConteudoService);
}
