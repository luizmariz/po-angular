import { Component } from '@angular/core';
import { PoMultiselectFilter, PoTableColumn } from '../../../ui/src/lib';
import { TesteHeroesService } from './testehero.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  debounce = 500;
  heroes: Array<any>;
  multiselect: Array<string> = ['1495831666871', '1405833068599'];

  filterService: PoMultiselectFilter;

  constructor(public samplePoMultiselectHeroesService: TesteHeroesService) {
    this.filterService = samplePoMultiselectHeroesService;
  }

  changeOptions(event): void {
    this.heroes = event;
  }
}
