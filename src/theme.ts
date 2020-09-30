/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { IRawTheme } from './main';

export const enum FontStyle {
  /**和none有啥区别 */
  NotSet = -1,
  None = 0,
  Italic = 1,
  Bold = 2,
  Underline = 4,
}
/**已经解析过的主题规则 */
export class ParsedThemeRule {
  _parsedThemeRuleBrand: void;

  readonly scope: string;
  readonly parentScopes: string[] | null;
  readonly index: number;

  /**
   * -1 if not set. An or mask of `FontStyle` otherwise.
   */
  readonly fontStyle: number;
  readonly foreground: string | null;
  readonly background: string | null;

  constructor(
    scope: string,
    parentScopes: string[] | null,
    index: number,
    fontStyle: number,
    foreground: string | null,
    background: string | null
  ) {
    this.scope = scope;
    this.parentScopes = parentScopes;
    this.index = index;
    this.fontStyle = fontStyle;
    this.foreground = foreground;
    this.background = background;
  }
}
/**rrggbb rrggbbaa rgb rgba */
/**判断是不是hex格式颜色 */
function isValidHexColor(hex: string): boolean {
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    // #rrggbb
    return true;
  }

  if (/^#[0-9a-f]{8}$/i.test(hex)) {
    // #rrggbbaa
    return true;
  }

  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    // #rgb
    return true;
  }

  if (/^#[0-9a-f]{4}$/i.test(hex)) {
    // #rgba
    return true;
  }

  return false;
}

/**
 * Parse a raw theme into rules.
 * 传入的配置解析
 * Parse a raw theme into rules. 解析规则为ParsedThemeRule[]
 */
export function parseTheme(/**传入格式*/ source: IRawTheme | undefined): ParsedThemeRule[] {
  if (!source) {
    return [];
  }
  if (!source.settings || !Array.isArray(source.settings)) {
    return [];
  }
  let settings = source.settings;
  let result: ParsedThemeRule[] = [],
    resultLen = 0;
  for (let i = 0, len = settings.length; i < len; i++) {
    let entry = settings[i];
    // 必须有设置的样式
    if (!entry.settings) {
      continue;
    }
    /**token */
    /**域列表 */
    let scopes: string[];
    if (typeof entry.scope === 'string') {
      let _scope = entry.scope;

      // remove leading commas 去掉前逗号
      _scope = _scope.replace(/^[,]+/, '');

      // remove trailing commans 去掉后逗号
      _scope = _scope.replace(/[,]+$/, '');

      scopes = _scope.split(',');
    } else if (Array.isArray(entry.scope)) {
      scopes = entry.scope;
    } else {
      scopes = [''];
    }
    /**字体样式 */
    /**字体的样式,用二进制保存 */
    let fontStyle: number = FontStyle.NotSet;
    if (typeof entry.settings.fontStyle === 'string') {
      fontStyle = FontStyle.None;
      // 如果是字符串,需要空格
      let segments = entry.settings.fontStyle.split(' ');
      for (let j = 0, lenJ = segments.length; j < lenJ; j++) {
        let segment = segments[j];
        switch (segment) {
          case 'italic':
            fontStyle = fontStyle | FontStyle.Italic;
            break;
          case 'bold':
            fontStyle = fontStyle | FontStyle.Bold;
            break;
          case 'underline':
            fontStyle = fontStyle | FontStyle.Underline;
            break;
        }
      }
    }
    /**
     * 前景
     */
    let foreground: string | null = null;
    if (typeof entry.settings.foreground === 'string' && isValidHexColor(entry.settings.foreground)) {
      foreground = entry.settings.foreground;
    }
    /**背景 */
    let background: string | null = null;
    if (typeof entry.settings.background === 'string' && isValidHexColor(entry.settings.background)) {
      background = entry.settings.background;
    }

    for (let j = 0, lenJ = scopes.length; j < lenJ; j++) {
      let _scope = scopes[j].trim();
      /**空格分离 */
      let segments = _scope.split(' ');
      /**最后 */
      /**最后要给 */
      let scope = segments[segments.length - 1];
      /**排除最后一个翻转 */
      let parentScopes: string[] | null = null;
      if (segments.length > 1) {
        parentScopes = segments.slice(0, segments.length - 1);
        parentScopes.reverse();
      }

      result[resultLen++] = new ParsedThemeRule(scope, parentScopes, i, fontStyle, foreground, background);
    }
  }

  return result;
}

/**
 * Resolve rules (i.e. inheritance).
 */
function resolveParsedThemeRules(parsedThemeRules: ParsedThemeRule[], _colorMap: string[] | undefined): Theme {
  // 域排序,靠字符串
  // Sort rules lexicographically, and then by index if necessary
  // 排序 字符串 父域排序 配置中的索引排序
  parsedThemeRules.sort((a, b) => {
    let r = strcmp(a.scope, b.scope);
    if (r !== 0) {
      return r;
    }
    // 如果普通域相同排父域
    r = strArrCmp(a.parentScopes, b.parentScopes);
    if (r !== 0) {
      return r;
    }
    // 如果都相等比较索引(这个索引其实是规则的索引)
    return a.index - b.index;
  });

  // Determine defaults
  let defaultFontStyle = FontStyle.None;
  let defaultForeground = '#000000';
  let defaultBackground = '#ffffff';
  // 处理默认规则的域
  //默认
  while (parsedThemeRules.length >= 1 && parsedThemeRules[0].scope === '') {
    let incomingDefaults = parsedThemeRules.shift()!;
    if (incomingDefaults.fontStyle !== FontStyle.NotSet) {
      defaultFontStyle = incomingDefaults.fontStyle;
    }
    if (incomingDefaults.foreground !== null) {
      defaultForeground = incomingDefaults.foreground;
    }
    if (incomingDefaults.background !== null) {
      defaultBackground = incomingDefaults.background;
    }
  }
  // 设置默认颜色映射,加速
  let colorMap = new ColorMap(_colorMap);
  let defaults = new ThemeTrieElementRule(0, null, defaultFontStyle, colorMap.getId(defaultForeground), colorMap.getId(defaultBackground));
  /**三元素 */
  let root = new ThemeTrieElement(new ThemeTrieElementRule(0, null, FontStyle.NotSet, 0, 0), []);
  for (let i = 0, len = parsedThemeRules.length; i < len; i++) {
    let rule = parsedThemeRules[i];
    root.insert(0, rule.scope, rule.parentScopes, rule.fontStyle, colorMap.getId(rule.foreground), colorMap.getId(rule.background));
  }

  return new Theme(colorMap, defaults, root);
}

export class ColorMap {
  private readonly _isFrozen: boolean;
  private _lastColorId: number;
  private _id2color: string[];
  private _color2id: { [color: string]: number };

  constructor(_colorMap?: string[]) {
    this._lastColorId = 0;
    this._id2color = [];
    this._color2id = Object.create(null);

    if (Array.isArray(_colorMap)) {
      this._isFrozen = true;
      for (let i = 0, len = _colorMap.length; i < len; i++) {
        this._color2id[_colorMap[i]] = i;
        this._id2color[i] = _colorMap[i];
      }
    } else {
      this._isFrozen = false;
    }
  }
  /**如果没有会自动存,没有0 索引id */
  public getId(color: string | null): number {
    if (color === null) {
      return 0;
    }
    color = color.toUpperCase();
    let value = this._color2id[color];
    if (value) {
      return value;
    }
    if (this._isFrozen) {
      throw new Error(`Missing color in color map - ${color}`);
    }
    value = ++this._lastColorId;
    this._color2id[color] = value;
    this._id2color[value] = color;
    return value;
  }

  public getColorMap(): string[] {
    return this._id2color.slice(0);
  }
}
/**创建的主题 */
export class Theme {
  /**
   * 通过配置创建主题
   *
   * @author cyia
   * @date 2020-09-06
   * @static
   * @param source vscode 主题
   * @param [colorMap] 可选
   * @returns
   */

  public static createFromRawTheme(source: IRawTheme | undefined, colorMap?: string[]): Theme {
    // 用初步解析过的规则去创建主题
    return this.createFromParsedTheme(parseTheme(source), colorMap);
  }

  public static createFromParsedTheme(source: ParsedThemeRule[], colorMap?: string[]): Theme {
    // 创建一个结构
    return resolveParsedThemeRules(source, colorMap);
  }

  private readonly _colorMap: ColorMap;
  private readonly _root: ThemeTrieElement;
  private readonly _defaults: ThemeTrieElementRule;
  private readonly _cache: { [scopeName: string]: ThemeTrieElementRule[] };

  constructor(colorMap: ColorMap, defaults: ThemeTrieElementRule, root: ThemeTrieElement) {
    this._colorMap = colorMap;
    this._root = root;
    this._defaults = defaults;
    this._cache = {};
  }
  /**颜色列表 */
  public getColorMap(): string[] {
    return this._colorMap.getColorMap();
  }
  /**默认规则 */
  public getDefaults(): ThemeTrieElementRule {
    return this._defaults;
  }
  /** 有搜索缓存 */
  public match(scopeName: string): ThemeTrieElementRule[] {
    if (!this._cache.hasOwnProperty(scopeName)) {
      this._cache[scopeName] = this._root.match(scopeName);
    }
    return this._cache[scopeName];
  }
}
/**根据字符串排序 */
export function strcmp(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}
/**数组字符串比较相等 */
export function strArrCmp(a: string[] | null, b: string[] | null): number {
  if (a === null && b === null) {
    return 0;
  }
  if (!a) {
    return -1;
  }
  if (!b) {
    return 1;
  }
  let len1 = a.length;
  let len2 = b.length;
  if (len1 === len2) {
    for (let i = 0; i < len1; i++) {
      let res = strcmp(a[i], b[i]);
      if (res !== 0) {
        return res;
      }
    }
    return 0;
  }
  return len1 - len2;
}
/**单主题3元素规则 */
export class ThemeTrieElementRule {
  _themeTrieElementRuleBrand: void;

  scopeDepth: number;
  parentScopes: string[] | null;
  fontStyle: number;
  foreground: number;
  background: number;

  constructor(scopeDepth: number, parentScopes: string[] | null, fontStyle: number, foreground: number, background: number) {
    this.scopeDepth = scopeDepth;
    this.parentScopes = parentScopes;
    this.fontStyle = fontStyle;
    this.foreground = foreground;
    this.background = background;
  }
  /**克隆 */
  public clone(): ThemeTrieElementRule {
    return new ThemeTrieElementRule(this.scopeDepth, this.parentScopes, this.fontStyle, this.foreground, this.background);
  }
  /**克隆列表 */
  public static cloneArr(arr: ThemeTrieElementRule[]): ThemeTrieElementRule[] {
    let r: ThemeTrieElementRule[] = [];
    for (let i = 0, len = arr.length; i < len; i++) {
      r[i] = arr[i].clone();
    }
    return r;
  }
  /**默认空域名会插一次,只会修改当前域深及相关样式,重写 */
  public acceptOverwrite(scopeDepth: number, fontStyle: number, foreground: number, background: number): void {
    if (this.scopeDepth > scopeDepth) {
      console.log('how did this happen?');
    } else {
      this.scopeDepth = scopeDepth;
    }
    // console.log('TODO -> my depth: ' + this.scopeDepth + ', overwriting depth: ' + scopeDepth);
    if (fontStyle !== FontStyle.NotSet) {
      this.fontStyle = fontStyle;
    }
    if (foreground !== 0) {
      this.foreground = foreground;
    }
    if (background !== 0) {
      this.background = background;
    }
  }
}

export interface ITrieChildrenMap {
  [segment: string]: ThemeTrieElement;
}

export class ThemeTrieElement {
  _themeTrieElementBrand: void;

  private readonly _mainRule: ThemeTrieElementRule;
  /**父域列表?,应该保存所有数据? */
  private readonly _rulesWithParentScopes: ThemeTrieElementRule[];
  /**子规则对象 */
  private readonly _children: ITrieChildrenMap;

  constructor(mainRule: ThemeTrieElementRule, rulesWithParentScopes: ThemeTrieElementRule[] = [], children: ITrieChildrenMap = {}) {
    this._mainRule = mainRule;
    this._rulesWithParentScopes = rulesWithParentScopes;
    this._children = children;
  }
  /**规则排序 */
  private static _sortBySpecificity(arr: ThemeTrieElementRule[]): ThemeTrieElementRule[] {
    if (arr.length === 1) {
      return arr;
    }

    arr.sort(this._cmpBySpecificity);

    return arr;
  }
  /**通过父域比较,相同的话比较字符串长度 */
  private static _cmpBySpecificity(a: ThemeTrieElementRule, b: ThemeTrieElementRule): number {
    if (a.scopeDepth === b.scopeDepth) {
      const aParentScopes = a.parentScopes;
      const bParentScopes = b.parentScopes;
      let aParentScopesLen = aParentScopes === null ? 0 : aParentScopes.length;
      let bParentScopesLen = bParentScopes === null ? 0 : bParentScopes.length;
      if (aParentScopesLen === bParentScopesLen) {
        for (let i = 0; i < aParentScopesLen; i++) {
          const aLen = aParentScopes![i].length;
          const bLen = bParentScopes![i].length;
          if (aLen !== bLen) {
            return bLen - aLen;
          }
        }
      }
      return bParentScopesLen - aParentScopesLen;
    }
    return b.scopeDepth - a.scopeDepth;
  }
  /**获得最后的域规则 */
  public match(scope: string): ThemeTrieElementRule[] {
    // 如果为空,那么进行所有规则的排序
    if (scope === '') {
      return ThemeTrieElement._sortBySpecificity((<ThemeTrieElementRule[]>[]).concat(this._mainRule).concat(this._rulesWithParentScopes));
    }

    let dotIndex = scope.indexOf('.');
    let head: string;
    let tail: string;
    if (dotIndex === -1) {
      head = scope;
      tail = '';
    } else {
      head = scope.substring(0, dotIndex);
      tail = scope.substring(dotIndex + 1);
    }
    //子元素有,那么通过子元素匹配
    if (this._children.hasOwnProperty(head)) {
      return this._children[head].match(tail);
    }

    return ThemeTrieElement._sortBySpecificity((<ThemeTrieElementRule[]>[]).concat(this._mainRule).concat(this._rulesWithParentScopes));
  }
  /**
   * 哪怕是一个普通的,都会先插一个,然后插一个空的结束递归
   */
  public insert(
    scopeDepth: number,
    scope: string,
    parentScopes: string[] | null,
    fontStyle: number,
    foreground: number,
    background: number
  ): void {
    if (scope === '') {
      this._doInsertHere(scopeDepth, parentScopes, fontStyle, foreground, background);
      return;
    }

    let dotIndex = scope.indexOf('.');
    let head: string;
    let tail: string;
    if (dotIndex === -1) {
      head = scope;
      tail = '';
    } else {
      head = scope.substring(0, dotIndex);
      tail = scope.substring(dotIndex + 1);
    }

    let child: ThemeTrieElement;
    if (this._children.hasOwnProperty(head)) {
      child = this._children[head];
    } else {
      /**类似当前的一个克隆 相当于一个壳,没有相关样式*/
      child = new ThemeTrieElement(this._mainRule.clone(), ThemeTrieElementRule.cloneArr(this._rulesWithParentScopes));
      this._children[head] = child;
    }

    child.insert(scopeDepth + 1, tail, parentScopes, fontStyle, foreground, background);
  }

  private _doInsertHere(
    scopeDepth: number,
    parentScopes: string[] | null,
    fontStyle: number,
    foreground: number,
    background: number
  ): void {
    if (parentScopes === null) {
      // Merge into the main rule
      this._mainRule.acceptOverwrite(scopeDepth, fontStyle, foreground, background);
      return;
    }

    // Try to merge into existing rule
    //这里的parentscope几乎没有,查看规则有没有和已有的相同,如果有那么重写规则
    for (let i = 0, len = this._rulesWithParentScopes.length; i < len; i++) {
      let rule = this._rulesWithParentScopes[i];

      if (strArrCmp(rule.parentScopes, parentScopes) === 0) {
        // bingo! => we get to merge this into an existing one
        rule.acceptOverwrite(scopeDepth, fontStyle, foreground, background);
        return;
      }
    }

    // Must add a new rule

    // Inherit from main rule
    if (fontStyle === FontStyle.NotSet) {
      fontStyle = this._mainRule.fontStyle;
    }
    if (foreground === 0) {
      foreground = this._mainRule.foreground;
    }
    if (background === 0) {
      background = this._mainRule.background;
    }
    //父域规则插入
    this._rulesWithParentScopes.push(new ThemeTrieElementRule(scopeDepth, parentScopes, fontStyle, foreground, background));
  }
}
