import { INodeType, INodeTypeDescription } from 'n8n-workflow';
import * as doc from './openapi.json';
import { wazendBaseDescription, wazendNodeDescription } from '../base/Wazend.node';
import { WazendOperationsCollector } from '../openapi/WazendOperationsCollector';
import {
	N8NPropertiesBuilder,
	N8NPropertiesBuilderConfig,
	Override,
} from '@devlikeapro/n8n-openapi-node';
import {WazendOperationParser} from "../openapi/WazendOperationParser";
import {WazendResourceParser} from "../openapi/WazendResourceParser";

const customDefaults: Override[] = [
	{
		find: {
			name: 'session',
			required: true,
			type: 'string',
		},
		replace: {
			default: '={{ $json.session }}',
		},
	},
	{
		find: {
			name: 'chatId',
			required: true,
			type: 'string',
		},
		replace: {
			default: '={{ $json.payload.from }}',
		},
	},
	{
		find: {
			name: 'messageId',
			type: 'string',
		},
		replace: {
			default: '={{ $json.payload.id }}',
		},
	},
	{
		find: {
			name: 'reply_to',
			type: 'string',
		},
		replace: {
			default: '',
		},
	},
];

const config: N8NPropertiesBuilderConfig = {
	OperationsCollector: WazendOperationsCollector as any,
	operation: new WazendOperationParser(),
	resource: new WazendResourceParser(),
};
const parser = new N8NPropertiesBuilder(doc, config);
const properties = parser.build(customDefaults);

export class Wazendv202502 implements INodeType {
	description: INodeTypeDescription = {
		...wazendBaseDescription,
		...wazendNodeDescription,
		version: 202502,
		usableAsTool: true,
		// @ts-ignore
		properties: properties,
	};
}
