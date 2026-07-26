import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConteudoService } from '../../core/i18n/conteudo-service';

@Component({
  selector: 'app-produtos',
  imports: [RouterLink],
  templateUrl: './produtos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Produtos {
  protected readonly cs = inject(ConteudoService);
}
