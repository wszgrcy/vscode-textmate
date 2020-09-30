/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

// -- raw grammar typings

export interface ILocation {
	readonly filename: string;
	readonly line: number;
	readonly char: number;
}

export interface ILocatable {
	/**配置中没这个字段 */
	readonly $vscodeTextmateLocation?: ILocation;
}
/**读文件的相关配置 */
export interface IRawGrammar extends ILocatable {
	repository: IRawRepository;
	readonly scopeName: string;
	readonly patterns: IRawRule[];
	readonly injections?: { [expression: string]: IRawRule };
	readonly injectionSelector?: string;

	readonly fileTypes?: string[];
	readonly name?: string;
	readonly firstLineMatch?: string;
}

export interface IRawRepositoryMap {
	[name: string]: IRawRule;
	/**自身 */
	$self: IRawRule;
	/**基准或者自身 */
	$base: IRawRule;
}

export type IRawRepository = IRawRepositoryMap & ILocatable;
/**原始规则 */
/**原始语法规则? */
export interface IRawRule extends ILocatable {
	id?: number;

	readonly include?: string;
/**根域会加入 */
	readonly name?: string;
	/**begin end中间的 */
	readonly contentName?: string;

	readonly match?: string;
	readonly captures?: IRawCaptures;
	readonly begin?: string;
	readonly beginCaptures?: IRawCaptures;
	readonly end?: string;
	readonly endCaptures?: IRawCaptures;
	/**没用过 */
	readonly while?: string;
	readonly whileCaptures?: IRawCaptures;
	readonly patterns?: IRawRule[];
/**感觉没套娃 */
	readonly repository?: IRawRepository;

	readonly applyEndPatternLast?: boolean;
}

export interface IRawCapturesMap {
	[captureId: string]: IRawRule;
}

export type IRawCaptures = IRawCapturesMap & ILocatable;


export interface IOnigLib {
	createOnigScanner(sources: string[]): OnigScanner;
	createOnigString(str: string): OnigString;
}

export interface IOnigCaptureIndex {
	start: number;
	end: number;
	length: number;
}

export interface IOnigMatch {
	index: number;
	captureIndices: IOnigCaptureIndex[];
}

export interface OnigScanner {
	findNextMatchSync(string: string | OnigString, startPosition: number): IOnigMatch;
	dispose?(): void;
}

export interface OnigString {
	readonly content: string;
	dispose?(): void;
}
