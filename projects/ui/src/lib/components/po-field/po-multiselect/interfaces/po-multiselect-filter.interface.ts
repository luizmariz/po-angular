import { Observable } from 'rxjs';
import { PoMultiSelectOption } from './po-multiselect-options.interface';

/**
 * @usedBy PoMultiSelect
 *
 * @description
 *
 * Interface para os serviços que serão utilizados no po-multiselect.
 */
export interface PoMultiSelectFilter {
  /**
   * Método responsável por retornar um Observable que contém uma coleção de objetos que seguem a interface PoMultiSelectOption,
   * será informado por parametro o campo, de acordo com o fieldLabel, e o valor a ser pesquisado.
   *
   * @param {any} params Objeto contendo a propriedade e o valor responsável por realizar o filtro.
   * @param {any} filterParams Valor informado através da propriedade `p-filter-params`.
   */
  getFilteredData(params: any, filterParams?: any): Observable<Array<PoMultiSelectOption>>;

  /**
   * Método responsável por retornar um Observable que contém apenas o objeto filtrado que seguem a interface PoMultiSelectOption,
   * será informado por parametro valor a ser pesquisado.
   *
   * @param {string | number} value Valor responsável por realizar a busca de um único objeto.
   * @param {any} filterParams Valor informado através da propriedade `p-filter-params`.
   */
  getObjectsByValues(value: Array<string | number>): Observable<Array<PoMultiSelectOption>>;
}
