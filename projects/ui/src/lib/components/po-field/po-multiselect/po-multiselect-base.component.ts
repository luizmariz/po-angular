import { EventEmitter, Input, OnInit, Output, Directive } from '@angular/core';
import { AbstractControl, ControlValueAccessor, Validator } from '@angular/forms';

import { Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

import {
  convertToBoolean,
  removeDuplicatedOptions,
  removeUndefinedAndNullOptions,
  sortOptionsByProperty
} from '../../../utils/util';
import { requiredFailed } from './../validators';
import { PoLanguageService } from '../../../services/po-language/po-language.service';
import { poLocaleDefault } from '../../../services/po-language/po-language.constant';

import { PoMultiselectFilterMode } from './po-multiselect-filter-mode.enum';
import { PoMultiselectLiterals } from './po-multiselect-literals.interface';
import { PoMultiselectOption } from './po-multiselect-option.interface';
import { InputBoolean } from '../../../decorators';
import { PoMultiselectFilter } from './po-multiselect-filter.interface';

const PO_MULTISELECT_DEBOUNCE_TIME_DEFAULT = 400;

export const poMultiselectLiteralsDefault = {
  en: <PoMultiselectLiterals>{
    noData: 'No data found',
    placeholderSearch: 'Search'
  },
  es: <PoMultiselectLiterals>{
    noData: 'Datos no encontrados',
    placeholderSearch: 'Busca'
  },
  pt: <PoMultiselectLiterals>{
    noData: 'Nenhum dado encontrado',
    placeholderSearch: 'Buscar'
  },
  ru: <PoMultiselectLiterals>{
    noData: 'Данные не найдены',
    placeholderSearch: 'искать'
  }
};

/**
 * @description
 *
 * O po-multiselect é um componente de múltipla seleção.
 * Este componente é recomendado para dar ao usuário a opção de selecionar vários itens em uma lista.
 *
 * Quando a lista possuir poucos itens, deve-se dar preferência para o uso do po-checkbox-group, por ser mais simples
 * e mais rápido para a seleção do usuário.
 *
 * Este componente também não deve ser utilizado em casos onde a seleção seja única. Nesses casos, deve-se utilizar o
 * po-select, po-combo ou po-radio-group.
 *
 * Com ele também é possível definir uma lista à partir da requisição de um serviço definido em `p-filter-service`.
 */
@Directive()
export abstract class PoMultiselectBaseComponent implements ControlValueAccessor, OnInit, Validator {
  /**
   * @optional
   *
   * @description
   *
   * Aplica foco no elemento ao ser iniciado.
   *
   * > Caso mais de um elemento seja configurado com essa propriedade, apenas o último elemento declarado com ela terá o foco.
   *
   * @default `false`
   */
  @Input('p-auto-focus') @InputBoolean() autoFocus: boolean = false;

  /** Label no componente. */
  @Input('p-label') label?: string;

  /** Texto de apoio para o campo. */
  @Input('p-help') help?: string;

  /**
   * @optional
   *
   * @description
   *
   * Define se a indicação de campo opcional será exibida.
   *
   * > Não será exibida a indicação se:
   * - O campo conter `p-required`;
   * - Não possuir `p-help` e/ou `p-label`.
   *
   * @default `false`
   */
  @Input('p-optional') optional: boolean;

  /** Mensagem apresentada enquanto o campo estiver vazio. */
  @Input('p-placeholder') placeholder?: string = '';

  /**
   * @description
   *
   * Placeholder do campo de pesquisa.
   *
   * > Caso o mesmo não seja informado, o valor padrão será traduzido com base no idioma do navegador (pt, es e en).
   *
   * @default `Buscar`
   */
  @Input('p-placeholder-search') placeholderSearch?: string = '';

  /** Nome do componente. */
  @Input('name') name: string;

  /**
   * @optional
   *
   * @description
   *
   * Pode ser informada uma função que será disparada quando houver alterações no ngModel.
   */
  @Output('p-change') change: EventEmitter<any> = new EventEmitter<any>();

  selectedOptions: Array<PoMultiselectOption> = [];
  visibleOptionsDropdown: Array<PoMultiselectOption> = [];
  visibleDisclaimers = [];
  isServerSearching = false;
  isFirstFilter: boolean = true;
  filterSubject = new Subject();

  // eslint-disable-next-line
  protected onModelTouched: any = null;

  protected clickOutListener: () => void;
  protected resizeListener: () => void;
  protected getObjectsByValuesSubscription: Subscription;

  private _filterService?: PoMultiselectFilter;
  private _debounceTime?: number = 400;
  private _disabled?: boolean = false;
  private _filterMode?: PoMultiselectFilterMode = PoMultiselectFilterMode.startsWith;
  private _hideSearch?: boolean = false;
  private _literals: PoMultiselectLiterals;
  private _options: Array<PoMultiselectOption>;
  private _required?: boolean = false;
  private _sort?: boolean = false;
  private _autoHeight: boolean = false;
  private language: string;

  private lastLengthModel;
  private onModelChange: any;
  private validatorChange: any;
  private autoHeightInitialValue: boolean;

  /**
   * @optional
   *
   * @description
   * Nesta propriedade deve ser informado um serviço implementando a interface PoMultiselectFilter.
   *
   * > Definirá por padrão a propriedade `p-auto-height` como `true`, mas a mesma pode ser redefinida caso necessário.
   */
  @Input('p-filter-service') set filterService(value: PoMultiselectFilter) {
    this._filterService = value;
    this.autoHeight = this.autoHeightInitialValue !== undefined ? this.autoHeightInitialValue : true;
    this.options = [];
  }

  get filterService() {
    return this._filterService;
  }

  /**
   * @optional
   *
   * @description
   *
   * Define que a altura do componente será auto ajustável, possuindo uma altura minima porém a altura máxima será de acordo
   * com o número de itens selecionados e a extensão dos mesmos, mantendo-os sempre visíveis.
   *
   * > O valor padrão será `true` quando houver serviço (`p-filter-service`).
   *
   * @default `false`
   */
  @Input('p-auto-height') @InputBoolean() set autoHeight(value: boolean) {
    this._autoHeight = value;
    this.autoHeightInitialValue = value;
  }

  get autoHeight(): boolean {
    return this._autoHeight;
  }

  /**
   * @optional
   *
   * @description
   * Esta propriedade define em quanto tempo (em milissegundos), aguarda para acionar o evento de filtro após cada pressionamento de tecla.
   *
   * > Será utilizada apenas quando houver serviço (`p-filter-service`) e somente será aceito valor maior do que *zero*.
   *
   * @default `400`
   */
  @Input('p-debounce-time') set debounceTime(value: number) {
    const parsedValue = parseInt(<any>value, 10);

    this._debounceTime = !isNaN(parsedValue) && parsedValue > 0 ? parsedValue : PO_MULTISELECT_DEBOUNCE_TIME_DEFAULT;
  }

  get debounceTime(): number {
    return this._debounceTime;
  }

  /**
   * @optional
   *
   * @description
   *
   * Objeto com as literais usadas no `po-multiselect`.
   *
   * Existem duas maneiras de customizar o componente, passando um objeto com todas as literais disponíveis:
   *
   * ```
   *  const customLiterals: PoMultiselectLiterals = {
   *    noData: 'Nenhum dado encontrado',
   *    placeholderSearch: 'Buscar'
   *  };
   * ```
   *
   * Ou passando apenas as literais que deseja customizar:
   *
   * ```
   *  const customLiterals: PoMultiselectLiterals = {
   *    noData: 'Sem dados'
   *  };
   * ```
   *
   * E para carregar as literais customizadas, basta apenas passar o objeto para o componente:
   *
   * ```
   * <po-multiselect
   *   [p-literals]="customLiterals">
   * </po-po-multiselect>
   * ```
   *
   * > O objeto padrão de literais será traduzido de acordo com o idioma do
   * [`PoI18nService`](/documentation/po-i18n) ou do browser.
   */
  @Input('p-literals') set literals(value: PoMultiselectLiterals) {
    if (value instanceof Object && !(value instanceof Array)) {
      this._literals = {
        ...poMultiselectLiteralsDefault[poLocaleDefault],
        ...poMultiselectLiteralsDefault[this.language],
        ...value
      };
    } else {
      this._literals = poMultiselectLiteralsDefault[this.language];
    }
  }
  get literals() {
    return this._literals || poMultiselectLiteralsDefault[this.language];
  }

  /**
   * @optional
   *
   * @description
   *
   * Indica que o campo será obrigatório. Esta propriedade é desconsiderada quando o campo está desabilitado (p-disabled).
   *
   * @default `false`
   */
  @Input('p-required') set required(required: boolean) {
    this._required = <any>required === '' ? true : convertToBoolean(required);
    this.validateModel();
  }

  get required() {
    return this._required;
  }

  /**
   * @optional
   *
   * @description
   *
   * Indica que o campo será desabilitado.
   *
   * @default `false`
   */
  @Input('p-disabled') set disabled(disabled: boolean) {
    this._disabled = <any>disabled === '' ? true : convertToBoolean(disabled);
    this.validateModel();

    this.updateVisibleItems();
  }

  get disabled() {
    return this._disabled;
  }

  /**
   * @optional
   *
   * @description
   *
   * Esconde o campo de pesquisa existente dentro do dropdown do po-multiselect.
   *
   * @default `false`
   */
  @Input('p-hide-search') set hideSearch(hideSearch: boolean) {
    this._hideSearch = <any>hideSearch === '' ? true : convertToBoolean(hideSearch);
  }

  get hideSearch() {
    return this._hideSearch;
  }

  /**
   * @description
   *
   * Nesta propriedade deve ser definida uma lista de objetos que implementam a interface PoMultiselectOption.
   * Esta lista deve conter os valores e os labels que serão apresentados na tela.
   *
   * > Essa propriedade é imutável, ou seja, sempre que quiser atualizar a lista de opções disponíveis
   * atualize a referência do objeto:
   *
   * ```
   * // atualiza a referência do objeto garantindo a atualização do template
   * this.options = [...this.options, { value: 'x', label: 'Nova opção' }];
   *
   * // evite, pois não atualiza a referência do objeto podendo gerar atrasos na atualização do template
   * this.options.push({ value: 'x', label: 'Nova opção' });
   * ```
   */
  @Input('p-options') set options(options: Array<PoMultiselectOption>) {
    this._options = options;

    this.validAndSortOptions();
  }

  get options() {
    return this._options;
  }

  /**
   * @optional
   *
   * @description
   *
   * Indica que a lista definida na propriedade p-options será ordenada pelo label antes de ser apresentada no
   * dropdown.
   *
   * @default `false`
   */
  @Input('p-sort') set sort(sort: boolean) {
    this._sort = <any>sort === '' ? true : convertToBoolean(sort);

    this.validAndSortOptions();
  }

  get sort() {
    return this._sort;
  }

  /**
   * @optional
   *
   * @description
   *
   * Define o modo de pesquisa utilizado no campo de busca, quando habilitado.
   * Valores definidos no enum: PoMultiselectFilterMode
   *
   * @default `startsWith`
   */
  @Input('p-filter-mode') set filterMode(filterMode: PoMultiselectFilterMode) {
    this._filterMode = filterMode in PoMultiselectFilterMode ? filterMode : PoMultiselectFilterMode.startsWith;
    switch (this._filterMode.toString()) {
      case 'startsWith':
        this._filterMode = PoMultiselectFilterMode.startsWith;
        break;
      case 'contains':
        this._filterMode = PoMultiselectFilterMode.contains;
        break;
      case 'endsWith':
        this._filterMode = PoMultiselectFilterMode.endsWith;
        break;
    }
  }

  get filterMode() {
    return this._filterMode;
  }

  constructor(languageService: PoLanguageService) {
    this.language = languageService.getShortLanguage();
  }

  ngOnInit() {
    if (this.filterService) {
      this.filterSubject
        .pipe(
          debounceTime(this.debounceTime),
          distinctUntilChanged(),
          tap(() => (this.isServerSearching = true)),
          switchMap((search: string) => this.applyFilter(search)),
          tap(() => (this.isServerSearching = false))
        )
        .subscribe();
    }

    this.updateList(this.options);
  }

  validAndSortOptions() {
    if (this.options && this.options.length) {
      removeUndefinedAndNullOptions(this.options);
      removeDuplicatedOptions(this.options);
      this.setUndefinedLabels(this.options);

      if (this.sort) {
        sortOptionsByProperty(this.options, 'label');
      }
    }
  }

  setUndefinedLabels(options) {
    options.forEach(option => {
      if (!option['label']) {
        option.label = option.value;
      }
    });
  }

  updateList(options: Array<PoMultiselectOption>) {
    if (options) {
      this.visibleOptionsDropdown = options;
    }
  }

  callOnChange(selectedOptions: Array<PoMultiselectOption>) {
    if (this.onModelChange) {
      this.onModelChange(this.getValuesFromOptions(selectedOptions));
      this.eventChange(selectedOptions);
    }
  }

  eventChange(selectedOptions) {
    if (selectedOptions && this.lastLengthModel !== selectedOptions.length) {
      this.change.emit(selectedOptions);
    }
    this.lastLengthModel = selectedOptions ? selectedOptions.length : null;
  }

  getValuesFromOptions(selectedOptions: Array<PoMultiselectOption>) {
    return selectedOptions && selectedOptions.length ? selectedOptions.map(option => option.value) : [];
  }

  getLabelByValue(value) {
    const index = this.options.findIndex(option => option.value === value);
    return this.options[index].label;
  }

  searchByLabel(search: string, options: Array<PoMultiselectOption>, filterMode: PoMultiselectFilterMode) {
    if (search && options && options.length) {
      const newOptions: Array<PoMultiselectOption> = [];
      options.forEach(option => {
        if (option.label && this.compareMethod(search, option, filterMode)) {
          newOptions.push(option);
        }
      });
      this.visibleOptionsDropdown = newOptions;
    }
  }

  compareMethod(search: string, option: PoMultiselectOption, filterMode: PoMultiselectFilterMode) {
    switch (filterMode) {
      case PoMultiselectFilterMode.startsWith:
        return this.startsWith(search, option);
      case PoMultiselectFilterMode.contains:
        return this.contains(search, option);
      case PoMultiselectFilterMode.endsWith:
        return this.endsWith(search, option);
    }
  }

  startsWith(search: string, option: PoMultiselectOption) {
    return option.label.toLowerCase().startsWith(search.toLowerCase());
  }

  contains(search: string, option: PoMultiselectOption) {
    return option.label.toLowerCase().indexOf(search.toLowerCase()) > -1;
  }

  endsWith(search: string, option: PoMultiselectOption) {
    return option.label.toLowerCase().endsWith(search.toLowerCase());
  }

  validate(c: AbstractControl): { [key: string]: any } {
    if (requiredFailed(this.required, this.disabled, c.value)) {
      return {
        required: {
          valid: false
        }
      };
    }

    return null;
  }

  updateSelectedOptions(newOptions: Array<any>, options = this.options) {
    this.selectedOptions = [];

    if (this.filterService) {
      this.selectedOptions = newOptions;
    } else {
      newOptions.forEach(newOption => {
        options.forEach(option => {
          if (option.value === newOption.value) {
            this.selectedOptions.push(option);
          }
        });
      });
    }

    this.updateVisibleItems();
  }

  writeValue(values: any): void {
    values = values || [];

    if (this.filterService && values.length) {
      this.getObjectsByValuesSubscription = this.filterService.getObjectsByValues(values).subscribe(options => {
        this.updateSelectedOptions(options);
        this.callOnChange(this.selectedOptions);
      });
    } else {
      // Validar se todos os items existem entre os options, senão atualizar o model
      this.updateSelectedOptions(values.map(value => ({ value })));

      if (this.selectedOptions && this.selectedOptions.length < values.length) {
        this.callOnChange(this.selectedOptions);
      }
    }
  }

  // Função implementada do ControlValueAccessor
  // Usada para interceptar os estados de habilitado via forms api
  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  registerOnChange(fn: any): void {
    this.onModelChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onModelTouched = fn;
  }

  registerOnValidatorChange(fn: () => void) {
    this.validatorChange = fn;
  }

  private validateModel() {
    if (this.validatorChange) {
      this.validatorChange();
    }
  }

  abstract applyFilter(value?: string): Observable<Array<PoMultiselectOption>>;
  abstract updateVisibleItems(): void;
}
