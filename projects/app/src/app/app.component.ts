import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component } from '@angular/core';
import { PoNotificationService, PoToasterOrientation } from '../../../ui/src/lib';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  orientation: string = 'botton';

  constructor(private notification: PoNotificationService) {}

  notificacao(type: string) {
    this.notification[type]({
      // orientation: PoToasterOrientation.Top,
      message: 'type',
      action: () => {
        alert('aa');
      },
      actionLabel: 'close'
    });
  }

  seisToaster() {
    for (let i = 0; i < 5; i++) {
      this.notification.success({
        message: 'type'
      });
    }
    this.notification.error({
      message: 'type',
      action: () => {
        alert('aa');
      },
      actionLabel: 'close'
    });
  }
}
