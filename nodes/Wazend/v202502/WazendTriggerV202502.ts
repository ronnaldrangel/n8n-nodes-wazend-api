import {
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import type { NodeConnectionType } from 'n8n-workflow';

import * as doc from './openapi.json';
import {
	BASE_TRIGGER_DESCRIPTION,
	CONFIGURE_WEBHOOK_NOTE,
	makeEventNote, makeWebhookForEvents,
	TRIGGER_DESCRIPTION,
} from '../base/WazendTrigger.node';

function getEvents() {
	const schemas = doc.components.schemas;
	const schema = schemas.WazendWebhookSessionStatus;
	const event = schema.properties.event;
	return event.enum;
}

const events = getEvents();
const outputs: NodeConnectionType[] = events.map(() => 'main');
const outputNames = events;


export class WazendTriggerV202502 implements INodeType {
	description: INodeTypeDescription = {
		...BASE_TRIGGER_DESCRIPTION,
		...TRIGGER_DESCRIPTION,
		version: 202502,
		usableAsTool: true,
		outputs: outputs,
		outputNames: outputNames,
		properties: [CONFIGURE_WEBHOOK_NOTE, makeEventNote(events)],
	};
	webhook = makeWebhookForEvents(events)
}
