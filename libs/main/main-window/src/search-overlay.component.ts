import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  ChangeDetectionStrategy,
  AfterViewChecked,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '@keira/shared/common-services';

@Component({
  selector: 'keira-search-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="visible" class="search-overlay">
      <input #searchInput type="text" [(ngModel)]="searchTerm" (input)="onSearch()" placeholder="Search..." autofocus />
      <span *ngIf="matchCount > 0">{{ currentIndex + 1 }}/{{ matchCount }}</span>
      <button (click)="nextMatch()">&#8595;</button>
      <button (click)="prevMatch()">&#8593;</button>
      <button (click)="close()">&#10005;</button>
    </div>
  `,
  styles: [
    `
      .search-overlay {
        position: fixed;
        top: 20px;
        right: 40px;
        background: #222;
        color: #fff;
        padding: 8px 16px;
        border-radius: 6px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .search-overlay input {
        background: #333;
        color: #fff;
        border: none;
        outline: none;
        padding: 4px 8px;
        border-radius: 4px;
        min-width: 120px;
      }
      .search-overlay button {
        background: none;
        border: none;
        color: #fff;
        font-size: 16px;
        cursor: pointer;
      }
    `,
  ],
})
export class SearchOverlayComponent implements OnInit, OnDestroy, AfterViewChecked {
  visible = false;
  searchTerm = '';
  matchCount = 0;
  currentIndex = 0;
  private matches: HTMLElement[] = [];
  private pageWrapper: HTMLElement | null = null;
  private keydownListener: (() => void) | null = null;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private readonly electronService = inject(ElectronService);
  private readonly renderer = inject(Renderer2);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    const isElectron = this.electronService.isElectron();
    console.log('[SearchOverlay] ngOnInit - isElectron:', isElectron);
    if (isElectron) {
      this.keydownListener = this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => {
        console.log('[SearchOverlay] Keydown event:', event);
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
          event.preventDefault();
          console.log('[SearchOverlay] CTRL/CMD+F detected, opening search overlay');
          this.open();
        }
        if (event.key === 'Escape' && this.visible) {
          console.log('[SearchOverlay] ESC detected, closing search overlay');
          this.close();
        }
      });
    }
  }

  ngAfterViewChecked() {
    if (this.visible && this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.focus();
      console.log('[SearchOverlay] search input focused (ngAfterViewChecked)');
    }
  }

  ngOnDestroy() {
    if (this.keydownListener) this.keydownListener();
    this.clearHighlights();
  }

  open() {
    console.log('[SearchOverlay] open() called');
    this.visible = true;
    this.cdr.markForCheck();
    // Do not focus here; focus is handled in ngAfterViewChecked
  }

  close() {
    this.visible = false;
    this.searchTerm = '';
    this.clearHighlights();
  }

  onSearch() {
    this.clearHighlights();
    if (!this.searchTerm) {
      this.matchCount = 0;
      this.currentIndex = 0;
      return;
    }
    this.pageWrapper = document.querySelector('.page-wrapper');
    if (!this.pageWrapper) return;
    const regex = new RegExp(this.escapeRegExp(this.searchTerm), 'gi');
    this.matches = [];
    this.highlightMatches(this.pageWrapper, regex);
    this.matchCount = this.matches.length;
    this.currentIndex = 0;
    this.scrollToCurrent();
  }

  nextMatch() {
    if (this.matchCount === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.matchCount;
    this.scrollToCurrent();
  }

  prevMatch() {
    if (this.matchCount === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.matchCount) % this.matchCount;
    this.scrollToCurrent();
  }

  scrollToCurrent() {
    this.matches.forEach((el, i) => el.classList.toggle('active-search-match', i === this.currentIndex));
    if (this.matches[this.currentIndex]) {
      this.matches[this.currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  clearHighlights() {
    if (!this.pageWrapper) return;
    const highlighted = this.pageWrapper.querySelectorAll('.search-match, .active-search-match');
    highlighted.forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });
    this.matches = [];
  }

  highlightMatches(node: Node, regex: RegExp) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      let match;
      let lastIndex = 0;
      const text = node.textContent;
      const parent = node.parentNode;
      if (!parent) return;
      const frag = document.createDocumentFragment();
      regex.lastIndex = 0;
      while ((match = regex.exec(text)) !== null) {
        const before = text.slice(lastIndex, match.index);
        if (before) frag.appendChild(document.createTextNode(before));
        const span = document.createElement('span');
        span.textContent = match[0];
        span.className = 'search-match';
        frag.appendChild(span);
        this.matches.push(span);
        lastIndex = match.index + match[0].length;
      }
      const after = text.slice(lastIndex);
      if (after) frag.appendChild(document.createTextNode(after));
      parent.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE && !(node as HTMLElement).classList.contains('search-overlay')) {
      Array.from(node.childNodes).forEach((child) => this.highlightMatches(child, regex));
    }
  }

  escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
