import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { SidebarService } from './sidebar/sidebar.service';
import { SearchOverlayComponent } from './search-overlay.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'keira-main-window',
  templateUrl: './main-window.component.html',
  styleUrls: ['./main-window.component.scss'],
  imports: [SidebarComponent, RouterOutlet, SearchOverlayComponent],
})
export class MainWindowComponent {
  readonly sidebarService = inject(SidebarService);
}
