import { ComponentRef, Injectable } from '@angular/core';

import { PoComponentInjectorService } from './../po-component-injector/po-component-injector.service';
import { PoNotificationBaseService } from './po-notification-base.service';
import { PoToaster } from './po-toaster/po-toaster.interface';
import { PoToasterOrientation } from './po-toaster/po-toaster-orientation.enum';
import { PoToasterComponent } from './po-toaster/po-toaster.component';

const MAX_LENGTH_NOTIFICATION = 5;
const TIME_OUT_FADEOUT = 300;

/**
 * @docsExtends PoNotificationBaseService
 *
 * @example
 *
 * <example name="po-notification-basic" title="PO Notification Basic">
 *  <file name="sample-po-notification-basic/sample-po-notification-basic.component.html"> </file>
 *  <file name="sample-po-notification-basic/sample-po-notification-basic.component.ts"> </file>
 * </example>
 *
 * <example name="po-notification-labs" title="PO Notification Labs">
 *  <file name="sample-po-notification-labs/sample-po-notification-labs.component.html"> </file>
 *  <file name="sample-po-notification-labs/sample-po-notification-labs.component.ts"> </file>
 * </example>
 *
 * <example name="po-notification-sales" title="PO Notification - Sales">
 *  <file name="sample-po-notification-sales/sample-po-notification-sales.component.html"> </file>
 *  <file name="sample-po-notification-sales/sample-po-notification-sales.component.ts"> </file>
 * </example>
 */

@Injectable({
  providedIn: 'root'
})
export class PoNotificationService extends PoNotificationBaseService {
  constructor(private poComponentInjector: PoComponentInjectorService) {
    super();
  }

  createToaster(toaster: PoToaster): void {
    const componentRef: ComponentRef<any> = this.poComponentInjector.createComponentInApplication(PoToasterComponent);
    toaster.componentRef = componentRef;

    componentRef.changeDetectorRef.detectChanges();
    componentRef.instance.configToaster(toaster);

    if (toaster.orientation === PoToasterOrientation.Top) {
      this.stackTop.push(componentRef);
    } else {
      this.stackBottom.push(componentRef);
    }
    this.verifyLimitToaster();

    this.observableOnClose(componentRef);

    if (!(toaster.action && toaster.actionLabel)) {
      setTimeout(() => {
        componentRef.instance.setFadeOut();
        this.destroyToaster(componentRef);
      }, toaster.duration);
    }
  }

  verifyLimitToaster() {
    if (this.stackBottom.length > MAX_LENGTH_NOTIFICATION) {
      this.stackBottom[0].instance.setFadeOut();
      this.destroyToaster(this.stackBottom[0]);
    }

    if (this.stackTop.length > MAX_LENGTH_NOTIFICATION) {
      this.stackTop[0].instance.setFadeOut();
      this.destroyToaster(this.stackTop[0]);
    }
  }

  destroyToaster(toaster: any): void {
    let stack;
    if (toaster.instance.orientation === PoToasterOrientation.Top) {
      stack = this.stackTop;
    } else {
      stack = this.stackBottom;
    }

    const index = stack.indexOf(toaster);
    stack.splice(index, 1);

    setTimeout(() => {
      this.poComponentInjector.destroyComponentInApplication(toaster);
      for (let count = 0; count < stack.length; count++) {
        stack[count].instance.changePosition(count);
      }
      toaster.instance.setShowToaster(false);
    }, TIME_OUT_FADEOUT);
  }

  private observableOnClose(componentRef: any) {
    componentRef.instance.observableOnClose.subscribe(() => {
      this.destroyToaster(componentRef);
    });
  }
}
