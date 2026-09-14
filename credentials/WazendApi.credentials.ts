import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WazendApi implements ICredentialType {
	name = 'wazendApi';
	displayName = 'Wazend API';
	documentationUrl = 'https://wazend.net/docs/introduccion';
	icon = 'file:wazend.svg' as const;
	properties: INodeProperties[] = [
		{
			displayName: 'Host URL',
			name: 'url',
			type: 'string',
			default: 'https://tu-servidor.wazend.net',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: false,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Api-Key': '={{$credentials.apiKey}}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/api/sessions',
		},
	};
}
