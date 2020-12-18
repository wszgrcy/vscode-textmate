/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
/**解析语法文件的 */
import { IRawGrammar } from './types';
import * as plist from './plist';
import { DebugFlags } from './debug';
import { parse as manualParseJSON } from './json';
/** 单纯解析配置文件的 */
export function parseRawGrammar(content: string, filePath: string | null = null): IRawGrammar {
	if (filePath !== null && /\.json$/.test(filePath)) {
		return parseJSONGrammar(content, filePath);
	}
	return parsePLISTGrammar(content, filePath);
}

function parseJSONGrammar(contents: string, filename: string | null): IRawGrammar {
	if (DebugFlags.InDebugMode) {
		return <IRawGrammar>manualParseJSON(contents, filename, true);
	}
	return <IRawGrammar>JSON.parse(contents);
}

function parsePLISTGrammar(contents: string, filename: string | null): IRawGrammar {
	if (DebugFlags.InDebugMode) {
		return <IRawGrammar>plist.parseWithLocation(contents, filename, '$vscodeTextmateLocation');
	}
	return <IRawGrammar>plist.parse(contents);
}
