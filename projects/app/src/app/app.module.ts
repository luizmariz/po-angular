import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

//import { PoModule } from '@po-ui/ng-components';
import { PoModule } from '../../../ui/src/lib';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    RouterModule.forRoot([], { relativeLinkResolution: 'legacy' }),
    PoModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
