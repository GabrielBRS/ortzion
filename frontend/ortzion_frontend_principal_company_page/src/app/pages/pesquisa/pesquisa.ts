import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConteudoService } from '../../core/i18n/conteudo-service';

@Component({
  selector: 'app-pesquisa',
  imports: [RouterLink],
  templateUrl: './pesquisa.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pesquisa {
  protected readonly cs = inject(ConteudoService);
}
