import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PoMultiSelectFilter } from './interfaces/po-multiselect-filter.interface';
import { PoMultiSelectOption } from './interfaces/po-multiselect-options.interface';

@Injectable({
  providedIn: 'root'
})
export class PoMultiselectFilterService implements PoMultiSelectFilter {
  fieldLabel: string = 'label';
  fieldValue: string = 'value';

  readonly headers: HttpHeaders = new HttpHeaders({
    'X-PO-No-Message': 'true'
  });

  private _url: string;
  private messages = [];

  get url(): string {
    return this._url;
  }

  constructor(private http: HttpClient) {}

  getFilteredData(param: any): Observable<Array<PoMultiSelectOption>> {
    const params = { filter: param.value };

    return this.http
      .get(`https://po-sample-api.herokuapp.com/v1/heroes?page=1&pageSize=10`, {
        responseType: 'json',
        params,
        headers: this.headers
      })
      .pipe(map(response => this.parseToArrayMultiselectOptions(response['items'])));
  }

  getObjectsByValues(value: Array<string | number>): Observable<Array<PoMultiSelectOption>> {
    console.log('getObjectsByValues');
    return this.http
      .get(`https://po-sample-api.herokuapp.com/v1/heroes/?value=${value.toString()}`, { headers: this.headers })
      .pipe(map(response => this.parseToArrayMultiselectOptions(response['items'])));
  }

  configProperties(url: string, fieldLabel: string, fieldValue: string) {
    this._url = url;
    this.fieldLabel = fieldLabel;
    this.fieldValue = fieldValue;
  }

  private parseToArrayMultiselectOptions(items: Array<any>): Array<PoMultiSelectOption> {
    if (items && items.length > 0) {
      return items.map(item => this.parseToMultiselectOption(item));
    }

    return [];
  }

  private parseToMultiselectOption(item: any): PoMultiSelectOption {
    const label = item.label;
    const value = item.value;

    return { label, value };
  }
}
