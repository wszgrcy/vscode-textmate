/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { createGrammar, Grammar, IGrammarRepository } from './grammar';
import { IRawGrammar } from './types';
import { IGrammar, IEmbeddedLanguagesMap, ITokenTypeMap } from './main';
import { Theme, ThemeTrieElementRule } from './theme';
import { IOnigLib } from './types';

export class SyncRegistry implements IGrammarRepository {

	private readonly _grammars: { [scopeName: string]: Grammar; };
	/**原始语法配置 */
	private readonly _rawGrammars: { [scopeName: string]: IRawGrammar; };
	/**查看注入语法 */
	private readonly _injectionGrammars: { [scopeName: string]: string[]; };
	private _theme: Theme;
	private readonly _onigLibPromise: Promise<IOnigLib>;

	constructor(theme: Theme, onigLibPromise: Promise<IOnigLib>) {
		this._theme = theme;
		this._grammars = {};
		this._rawGrammars = {};
		this._injectionGrammars = {};
		this._onigLibPromise = onigLibPromise;
	}
/**销毁所有语法 */
	public dispose(): void {
		for (const scopeName in this._grammars) {
			if (this._grammars.hasOwnProperty(scopeName)) {
				this._grammars[scopeName].dispose();
			}
		}
	}
/**给每个语法触发一次变更主题 */
	public setTheme(theme: Theme): void {
		this._theme = theme;
		Object.keys(this._grammars).forEach((scopeName) => {
			let grammar = this._grammars[scopeName];
			grammar.onDidChangeTheme();
		});
	}
/**获得ColorMap渲染用 */
	public getColorMap(): string[] {
		return this._theme.getColorMap();
	}

	/**
	 * Add `grammar` to registry and return a list of referenced scope names
	 */
	public addGrammar(grammar: IRawGrammar, injectionScopeNames?: string[]): void {
		this._rawGrammars[grammar.scopeName] = grammar;
//设置注入语法
		if (injectionScopeNames) {
			this._injectionGrammars[grammar.scopeName] = injectionScopeNames;
		}
	}

	/**
	 * Lookup a raw grammar.
	 * 查看原始语法配置
	 */
	public lookup(scopeName: string): IRawGrammar {
		return this._rawGrammars[scopeName];
	}

	/**
	 * Returns the injections for the given grammar
	 * 查看注入语法
	 */
	public injections(targetScope: string): string[] {
		return this._injectionGrammars[targetScope];
	}

	/**
	 * Get the default theme settings
	 * 查看起始默认规则
	 */
	public getDefaults(): ThemeTrieElementRule {
		return this._theme.getDefaults();
	}

	/**
	 * Match a scope in the theme.
	 * 是否有规则匹配上
	 */
	public themeMatch(scopeName: string): ThemeTrieElementRule[] {
		return this._theme.match(scopeName);
	}

	/**
	 * Lookup a grammar.
	 *
	 */
	public async grammarForScopeName(scopeName: string, initialLanguage: number, embeddedLanguages: IEmbeddedLanguagesMap | null,/**token类型map */ tokenTypes: ITokenTypeMap | null): Promise<IGrammar | null> {
		if (!this._grammars[scopeName]) {
			let rawGrammar = this._rawGrammars[scopeName];
			if (!rawGrammar) {
				return null;
			}
			//通过原始语法配置创建解析后的语法
			this._grammars[scopeName] = createGrammar(rawGrammar, initialLanguage, embeddedLanguages, tokenTypes, this, await this._onigLibPromise);
		}
		return this._grammars[scopeName];
	}
}
