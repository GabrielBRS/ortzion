import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConteudoService } from '../../core/i18n/conteudo-service';
import { URL_SITE_CONSULTORIA } from '../../core/i18n/idiomas';

@Component({
  selector: 'app-consultoria',
  imports: [RouterLink],
  templateUrl: './consultoria.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Consultoria {
  protected readonly cs = inject(ConteudoService);
  protected readonly urlSiteConsultoria = URL_SITE_CONSULTORIA;
}
