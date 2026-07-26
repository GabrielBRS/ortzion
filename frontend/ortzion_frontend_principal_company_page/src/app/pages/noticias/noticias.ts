import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConteudoService } from '../../core/i18n/conteudo-service';

@Component({
  selector: 'app-noticias',
  imports: [RouterLink],
  templateUrl: './noticias.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Noticias {
  protected readonly cs = inject(ConteudoService);
}
