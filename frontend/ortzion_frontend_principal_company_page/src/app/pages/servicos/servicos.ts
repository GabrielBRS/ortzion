import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConteudoService } from '../../core/i18n/conteudo-service';

@Component({
  selector: 'app-servicos',
  imports: [RouterLink],
  templateUrl: './servicos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Servicos {
  protected readonly cs = inject(ConteudoService);
}
