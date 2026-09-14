import type {INodeTypeBaseDescription, NodeConnectionType} from "n8n-workflow";

// Base descriptions shared by every version of the regular Wazend node.
export const wazendBaseDescription: INodeTypeBaseDescription = {
	name: 'wazend',
	displayName: 'Wazend',
	icon: 'file:wazend.svg',
	description: 'Connect with Whatsapp HTTP API',
	group: ['transform'],
};


export const wazendNodeDescription = {
	subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
	// String literals keep the node working on both the legacy enum export and
	// the current `NodeConnectionTypes` object of n8n-workflow.
	inputs: ['main'] as NodeConnectionType[],
	outputs: ['main'] as NodeConnectionType[],
	defaults: {
		name: 'Wazend',
	},
	credentials: [
		{
			name: 'wazendApi',
			required: true,
		},
	],
	requestDefaults: {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		baseURL: '={{$credentials.url}}',
	},
}
