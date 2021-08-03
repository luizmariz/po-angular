import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component } from '@angular/core';
import { PoNotificationService } from '../../../ui/src/lib';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  animations: [
    trigger('fadeInOut', [
      state(
        'void',
        style({
          opacity: 0
        })
      ),
      transition('void <=> *', animate(500))
    ])
  ]
})
export class AppComponent {
  orientation: string = 'botton';

  constructor(private notification: PoNotificationService) {}

  notificacao(type: string) {
    this.notification[type]({
      message: 'type',
      action: () => {
        alert('aa');
      },
      actionLabel: 'close'
    });
  }

  variosSemAction() {
    for (let i = 0; i < 30; i++) {
      this.notification.success({
        message: 'type'
      });
      this.notification.error({
        message: 'type'
      });
    }
  }

  variosSemAction2() {
    for (let i = 0; i < 30; i++) {
      this.notification.information({
        message: 'type'
      });
      setTimeout(() => {
        this.notification.warning({
          message: 'type'
        });
      }, 1000);
    }
  }

  variosComAction() {
    for (let i = 0; i < 30; i++) {
      this.notification.success({
        message: 'type',
        action: () => {
          alert('aa');
        },
        actionLabel: 'close'
      });
      this.notification.error({
        message: 'type',
        action: () => {
          alert('aa');
        },
        actionLabel: 'close'
      });
    }
  }
}
