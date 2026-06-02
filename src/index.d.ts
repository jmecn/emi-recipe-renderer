export declare const MISSING_ICON_ID: string;

export declare function stripMinecraftFormatting(text: string): string;
export declare function applyMinecraftFormattedContent(
  element: HTMLElement,
  text: string,
): void;
export declare function setFormattedText(element: HTMLElement, text: string): void;
export declare function hasMinecraftFormatting(text: string): boolean;
export declare function stripRegistryId(id: string): string;

export declare function initEmiSlotCarousels(root: ParentNode): void;
export declare function hideEmiTagPopover(popEl?: HTMLElement | null): void;
export declare function showEmiTagPopover(
  tag: unknown,
  anchorEl: HTMLElement,
  renderer: EmiRecipeRenderer,
  tagKind?: string,
): Promise<void>;

export interface EmiDisplaySize {
  width: number;
  height: number;
  scale?: number;
  margin?: number;
}

export interface EmiMountProgress {
  mounted: number;
  failed: number;
  pending: number;
  total: number;
}

export interface EmiMountError {
  recipeId: string;
  error: unknown;
}

export interface EmiMountStats {
  mounted: number;
  failed: number;
  pending: number;
  total: number;
}

export interface EmiLazyMountHandle {
  total: number;
  mounted: number;
  failed: number;
  errors: EmiMountError[];
  baseUrl: string;
  lazy: boolean;
  getStats(): EmiMountStats;
  disconnect(): void;
  flush(): Promise<void>;
}

export interface EmiEagerMountResult {
  total: number;
  mounted: number;
  failed: number;
  errors: EmiMountError[];
  baseUrl: string;
  lazy: false;
}

export type EmiMountAllResult = EmiEagerMountResult | EmiLazyMountHandle;

export interface EmiRendererOptions {
  baseUrl?: string;
  resourceVersion?: string;
  missingIconId?: string;
  injectIconStylesheets?: boolean;
  locale?: string;
  lang?: Record<string, unknown>;
  translations?: Record<string, unknown>;
  tooltipElement?: HTMLElement | null;
  tagPopoverElement?: HTMLElement | null;
  tooltipElementId?: string;
  tagPopoverElementId?: string;
  onItemClick?: (itemId: string, context?: Record<string, unknown>) => void;
  onTagClick?: (tag: unknown, context?: Record<string, unknown>) => void;
}

export interface EmiMountOptions extends EmiRendererOptions {
  root?: ParentNode;
  selector?: string;
  recipeId?: string;
  lazy?: boolean;
  observeRoot?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
  mountConcurrency?: number;
  onProgress?: (progress: EmiMountProgress) => void;
}

export interface EmiMountElementResult {
  recipeId: string;
  baseUrl: string;
  renderer: EmiRecipeRenderer;
}

export declare class EmiRecipeRenderer {
  constructor(options?: EmiRendererOptions);

  baseUrl: string;
  locale: string;
  missingIconId: string;

  static stripMinecraftFormatting: typeof stripMinecraftFormatting;
  static setFormattedText: typeof setFormattedText;
  static hasMinecraftFormatting: typeof hasMinecraftFormatting;
  static displaySizeFromMeta(
    meta: { width?: number; height?: number; margin?: number },
    imageScale?: number,
  ): EmiDisplaySize;
  static displaySizeFromLayout(layout: {
    scale?: number;
    panel?: {
      width?: number;
      height?: number;
      margin?: number;
      frameWidth?: number;
      frameHeight?: number;
    };
  }): EmiDisplaySize;

  static mountElement(
    el: HTMLElement,
    options?: EmiMountOptions,
  ): Promise<EmiMountElementResult>;
  static mountAll(options?: EmiMountOptions): Promise<EmiMountAllResult>;

  setLocale(locale: string): void;
  resolveResourceUrl(relativePath: string): string;
  loadIndex(): Promise<unknown>;
  loadRecipeMeta(recipeId: string): Promise<{
    width?: number;
    height?: number;
    margin?: number;
    widgets?: unknown[];
  }>;
  resolveRecipeCard(recipeId: string): { imageUrl: string };
  createAtlasSpanForItem(registryId: string): HTMLSpanElement;
  createAtlasSpanForIconKey(lookupKey: string): HTMLSpanElement;
  createAtlasSpanForCategoryIcon(categoryId: string): HTMLSpanElement;
  preloadTagMembersForMeta(meta: { widgets?: unknown[] }): Promise<void>;
}
