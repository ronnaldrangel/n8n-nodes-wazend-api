import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';
import {BASE_TRIGGER_DESCRIPTION} from "./base/trigger";
import {WazendTriggerV202409} from "./v202409/WazendTriggerV202409";
import {WazendTriggerV202502} from "./v202502/WazendTriggerV202502";

export class WazendTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			...BASE_TRIGGER_DESCRIPTION,
			defaultVersion: 202502,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			202502: new WazendTriggerV202502(),
			202409: new WazendTriggerV202409(),
		};

		super(nodeVersions, baseDescription);
	}
}
