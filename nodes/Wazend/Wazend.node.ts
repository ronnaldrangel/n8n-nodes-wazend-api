import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';
import { Wazendv202409 } from './v202409/Wazendv202409';
import {wazendBaseDescription} from "./base/Wazend.node";
import {Wazendv202502} from "./v202502/Wazendv202502";

export class Wazend extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			...wazendBaseDescription,
			defaultVersion: 202502,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			202502: new Wazendv202502(),
			202409: new Wazendv202409(),
		};

		super(nodeVersions, baseDescription);
	}
}
